import { supabase } from '../utils/supabase'
import { KEYS, getData, setData, withoutRemotePersistence } from './storageService'
import { defaultSettings } from '../data/seedData'
import { withoutLegacyDemoRecords, withoutLegacyDemoSettings } from '../data/legacyDemoData'

const COLLECTIONS = [
  [KEYS.users, 'users'],
  [KEYS.companies, 'companies'],
  [KEYS.meetings, 'meetings'],
  [KEYS.actionItems, 'actionItems'],
  [KEYS.documents, 'documents'],
  [KEYS.teams, 'teams'],
  [KEYS.notifications, 'notifications'],
  [KEYS.settings, 'settings'],
  [KEYS.activity, 'activity'],
]

const collectionByKey = new Map(COLLECTIONS)
const keyByCollection = new Map(COLLECTIONS.map(([key, collection]) => [collection, key]))
const pendingWrites = new Map()
const pendingLoads = new Map()
const recordSyncs = new Map()
const deletedMeetingIds = new Map()
const meetingDeletes = new Map()
const sharedCollections = new Set(['companies', 'meetings', 'actionItems', 'documents', 'activity'])
const uniqueBy = (rows, keyFor) => {
  const seen = new Set()
  return rows.filter((row) => {
    const key = keyFor(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const sanitizeRecord = (key, record) => {
  const safeRecord = { ...record }
  if (key === KEYS.users) delete safeRecord.password
  delete safeRecord.workspaceOwnerId
  if (key === KEYS.meetings) {
    delete safeRecord.workspaceShared
    delete safeRecord.sharedOwnerId
  }
  return safeRecord
}

const valuesToRows = (ownerId, key, value, ownersByRecord = new Map()) => {
  const collection = collectionByKey.get(key)
  if (!collection || value == null) return []
  if (key === KEYS.teams) return []
  const records = Array.isArray(value) ? value : [{ id: 'default', value }]
  return uniqueBy(
    records
      .filter((record) => record && record.id != null)
      .map((record) => {
        const recordId = String(record.id)
        const owners = ownersByRecord.get(recordId) || []
        const declaredOwner = record.workspaceOwnerId || record.sharedOwnerId
        const owner = declaredOwner && owners.includes(String(declaredOwner))
          ? String(declaredOwner)
          : owners.includes(ownerId)
            ? ownerId
            : owners.length === 1
              ? owners[0]
              : ownerId
        return {
          owner_id: owner,
          collection,
          record_id: recordId,
          data: sanitizeRecord(key, Array.isArray(value) ? record : record.value),
        }
      }),
    (row) => `${row.owner_id}:${row.collection}:${row.record_id}`
  )
}

const sharedMeetingRows = (ownerId, meetings) =>
  (Array.isArray(meetings) ? meetings : [])
    .filter((meeting) => {
      return meeting?.createdBy === ownerId ||
        meeting?.sharedOwnerId === ownerId ||
        meeting?.workspaceOwnerId === ownerId
    })
    .map((meeting) => {
      const meetingOwnerId = meeting.sharedOwnerId || meeting.workspaceOwnerId || ownerId
      const meetingData = sanitizeRecord(KEYS.meetings, meeting)
      delete meetingData.sharedActionItems
      return {
        id: String(meeting.id),
        owner_id: meetingOwnerId,
        participant_ids: [...new Set((meeting.participants || [])
          .map((participant) => String(participant.userId || ''))
          .filter((participantId) => participantId && participantId !== meetingOwnerId))],
        data: {
          ...meetingData,
          companyName: meeting.companyName ||
            getData(KEYS.companies, []).find((company) => company.id === meeting.companyId)?.name ||
            '',
        },
        created_at: meeting.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

const resolveWorkspaceRecordOwners = async (ownerId, collection, value, previousValue) => {
  const recordsWithOtherOwner = [
    ...(Array.isArray(value) ? value : []),
    ...(Array.isArray(previousValue) ? previousValue : []),
  ].filter((record) => {
    const declaredOwner = record?.workspaceOwnerId || record?.sharedOwnerId
    return declaredOwner && String(declaredOwner) !== ownerId
  })
  if (!recordsWithOtherOwner.length) return new Map()

  const recordIds = [...new Set(recordsWithOtherOwner
    .filter((record) => record?.id != null)
    .map((record) => String(record.id)))]
  if (!recordIds.length) return new Map()

  const { data, error } = await supabase
    .from('workspace_records')
    .select('owner_id, record_id')
    .eq('collection', collection)
    .in('record_id', recordIds)
  if (error) throw error

  const ownersByRecord = new Map()
  for (const row of data || []) {
    const owners = ownersByRecord.get(String(row.record_id)) || []
    owners.push(String(row.owner_id))
    ownersByRecord.set(String(row.record_id), owners)
  }
  return ownersByRecord
}

const persistCollectionForUser = async (ownerId, key, value, previousValue = null) => {
  const collection = collectionByKey.get(key)
  if (!supabase || !collection) return

  const deletedIds = key === KEYS.meetings ? deletedMeetingIds.get(ownerId) : null
  const persistedValue = deletedIds && Array.isArray(value)
    ? value.filter((meeting) => !deletedIds.has(String(meeting.id)))
    : value
  const ownersByRecord = await resolveWorkspaceRecordOwners(ownerId, collection, value, previousValue)
  const rows = valuesToRows(ownerId, key, persistedValue, ownersByRecord)
  const previousRows = new Map(
    valuesToRows(ownerId, key, previousValue, ownersByRecord)
      .map((row) => [`${row.owner_id}:${row.record_id}`, row])
  )
  const changedRows = rows.filter((row) => {
    const previous = previousRows.get(`${row.owner_id}:${row.record_id}`)
    return !previous || stableJson(previous.data) !== stableJson(row.data)
  })
  if (changedRows.length) {
    const { error } = await supabase
      .from('workspace_records')
      .upsert(changedRows.map((row) => ({ ...row, updated_at: new Date().toISOString() })), {
        onConflict: 'owner_id,collection,record_id',
      })
    if (error) throw error
  }

  const nextKeys = new Set(rows.map((row) => `${row.owner_id}:${row.record_id}`))
  const removedRows = valuesToRows(ownerId, key, previousValue, ownersByRecord)
    .filter((row) => !nextKeys.has(`${row.owner_id}:${row.record_id}`))
  const removedByOwner = new Map()
  for (const row of removedRows) {
    const ownerRows = removedByOwner.get(row.owner_id) || []
    ownerRows.push(row.record_id)
    removedByOwner.set(row.owner_id, ownerRows)
  }
  for (const [recordOwnerId, recordIds] of removedByOwner) {
    const { error } = await supabase
      .from('workspace_records')
      .delete()
      .eq('owner_id', recordOwnerId)
      .eq('collection', collection)
      .in('record_id', recordIds)
    if (error) throw error
  }

  if (key === KEYS.teams) {
    const teams = Array.isArray(value) ? value : []
    const previousTeams = Array.isArray(previousValue) ? previousValue : []
    const previousById = new Map(previousTeams.map((team) => [String(team.id), team]))
    const teamData = (team) => {
      const { workspaceShared, sharedOwnerId, workspaceOwnerId, ...data } = team
      return data
    }
    const rowsToSave = uniqueBy(
      teams
        .filter((team) => team?.id != null)
        .filter((team) => {
          const previous = previousById.get(String(team.id))
          return !previous || stableJson(teamData(previous)) !== stableJson(teamData(team))
        })
        .map((team) => ({
          id: String(team.id),
          data: teamData(team),
          created_at: team.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      (row) => row.id
    )

    if (rowsToSave.length) {
      const { error } = await supabase
        .from('shared_teams')
        .upsert(rowsToSave, { onConflict: 'id' })
      if (error) throw error
    }

    const nextIds = new Set(teams.filter((team) => team?.id != null).map((team) => String(team.id)))
    const removedIds = previousTeams
      .filter((team) => team?.id != null && !nextIds.has(String(team.id)))
      .map((team) => String(team.id))
    if (removedIds.length) {
      const { error } = await supabase
        .from('shared_teams')
        .delete()
        .in('id', removedIds)
      if (error) throw error
    }
  }

  if (key === KEYS.meetings || key === KEYS.actionItems) {
    const meetings = key === KEYS.meetings ? persistedValue : getData(KEYS.meetings, [])
    const sharedRows = uniqueBy(
      sharedMeetingRows(ownerId, meetings),
      (row) => row.id
    )
    if (sharedRows.length) {
      const { error } = await supabase
        .from('shared_meetings')
        .upsert(sharedRows, { onConflict: 'id' })
      if (error) throw error
    }

    if (key === KEYS.meetings && Array.isArray(previousValue)) {
      const nextIds = new Set((Array.isArray(meetings) ? meetings : []).map((meeting) => String(meeting.id)))
      const removedMeetings = previousValue.filter((meeting) => {
        if (nextIds.has(String(meeting.id))) return false
        return meeting?.createdBy === ownerId ||
          meeting?.sharedOwnerId === ownerId ||
          meeting?.workspaceOwnerId === ownerId
      })
      if (removedMeetings.length) {
        const { error } = await supabase
          .from('shared_meetings')
          .delete()
          .eq('owner_id', ownerId)
          .in('id', removedMeetings.map((meeting) => String(meeting.id)))
        if (error) throw error
        const { data: remainingMeetings, error: verifyMeetingsError } = await supabase
          .from('shared_meetings')
          .select('id')
          .eq('owner_id', ownerId)
          .in('id', removedMeetings.map((meeting) => String(meeting.id)))
        if (verifyMeetingsError) throw verifyMeetingsError
        if (remainingMeetings?.length) {
          throw new Error('The meeting is still present in cloud storage. Check your access and try again.')
        }

        const removedWorkspaceMeetings = new Map()
        for (const meeting of removedMeetings) {
          const recordOwnerId = meeting.workspaceOwnerId || meeting.sharedOwnerId || ownerId
          const recordIds = removedWorkspaceMeetings.get(recordOwnerId) || []
          recordIds.push(String(meeting.id))
          removedWorkspaceMeetings.set(recordOwnerId, recordIds)
        }
        for (const [recordOwnerId, recordIds] of removedWorkspaceMeetings) {
          const { error: workspaceDeleteError } = await supabase
            .from('workspace_records')
            .delete()
            .eq('owner_id', recordOwnerId)
            .eq('collection', 'meetings')
            .in('record_id', recordIds)
          if (workspaceDeleteError) throw workspaceDeleteError
          const { data: remainingRecords, error: verifyRecordsError } = await supabase
            .from('workspace_records')
            .select('record_id')
            .eq('owner_id', recordOwnerId)
            .eq('collection', 'meetings')
            .in('record_id', recordIds)
          if (verifyRecordsError) throw verifyRecordsError
          if (remainingRecords?.length) {
            throw new Error('The meeting is still present in cloud workspace records. Check your access and try again.')
          }
        }
      }
    }
  }
}

export const persistWorkspaceChange = async (key, value, previousValue) => {
  if (!supabase || !collectionByKey.has(key)) return
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const ownerId = data.session?.user?.id
  if (!ownerId) return
  const queueKey = `${ownerId}:${key}`
  const previousWrite = pendingWrites.get(queueKey) || Promise.resolve()
  const currentWrite = previousWrite
    .catch(() => {})
    .then(() => persistCollectionForUser(ownerId, key, value, previousValue))
  pendingWrites.set(queueKey, currentWrite)
  try {
    await currentWrite
  } finally {
    if (pendingWrites.get(queueKey) === currentWrite) pendingWrites.delete(queueKey)
  }
}

export const deleteWorkspaceMeeting = async (meetingId) => {
  if (!supabase) return true

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const ownerId = sessionData.session?.user?.id
  if (!ownerId) throw new Error('Sign in again before deleting this meeting.')

  const id = String(meetingId)
  const deleteKey = `${ownerId}:${id}`
  const existingDelete = meetingDeletes.get(deleteKey)
  if (existingDelete) return existingDelete

  let tombstones = deletedMeetingIds.get(ownerId)
  if (!tombstones) {
    tombstones = new Set()
    deletedMeetingIds.set(ownerId, tombstones)
  }
  tombstones.add(id)

  const queueKey = `${ownerId}:${KEYS.meetings}`
  const previousWrite = pendingWrites.get(queueKey) || Promise.resolve()
  const currentDelete = previousWrite
    .catch(() => {})
    .then(async () => {
      const { data, error } = await supabase.rpc('delete_workspace_meeting', {
        p_meeting_id: id,
      })
      if (error) throw error
      if (data !== true) throw new Error('Supabase did not confirm that the meeting was deleted.')

      const [{ data: remainingMeetings, error: meetingError }, { data: remainingRecords, error: recordError }] = await Promise.all([
        supabase
          .from('shared_meetings')
          .select('id')
          .eq('id', id)
          .eq('owner_id', ownerId),
        supabase
          .from('workspace_records')
          .select('record_id')
          .eq('record_id', id)
          .eq('collection', 'meetings')
          .eq('owner_id', ownerId),
      ])
      if (meetingError) throw meetingError
      if (recordError) throw recordError
      if (remainingMeetings?.length || remainingRecords?.length) {
        throw new Error('Supabase still has a copy of this meeting after deletion.')
      }
      return true
    })

  meetingDeletes.set(deleteKey, currentDelete)
  pendingWrites.set(queueKey, currentDelete)
  try {
    return await currentDelete
  } catch (error) {
    tombstones.delete(id)
    if (tombstones.size === 0) deletedMeetingIds.delete(ownerId)
    throw error
  } finally {
    if (meetingDeletes.get(deleteKey) === currentDelete) meetingDeletes.delete(deleteKey)
    if (pendingWrites.get(queueKey) === currentDelete) pendingWrites.delete(queueKey)
  }
}

export const isMeetingPendingDeletion = (ownerId, meetingId) =>
  deletedMeetingIds.get(ownerId)?.has(String(meetingId)) || false

const refreshSharedWorkspaceRecords = async (authUserId) => {
  const [{ data, error }, { data: sharedMeetings, error: sharedMeetingsError }] = await Promise.all([
    supabase
      .from('workspace_records')
      .select('owner_id, collection, record_id, data')
      .in('collection', [...sharedCollections])
      .order('updated_at', { ascending: false }),
    supabase.from('shared_meetings').select('id'),
  ])
  if (error) throw error
  if (sharedMeetingsError) throw sharedMeetingsError

  const rowsByCollection = new Map()
  for (const row of data || []) {
    if (row.collection === 'meetings' && isMeetingPendingDeletion(authUserId, row.record_id)) continue
    const rows = rowsByCollection.get(row.collection) || []
    const key = keyByCollection.get(row.collection)
    rows.push({
      ...sanitizeRecord(key, row.data),
      workspaceOwnerId: row.owner_id,
    })
    rowsByCollection.set(row.collection, rows)
  }

  const workspaceMeetingIds = new Set(
    (rowsByCollection.get('meetings') || []).map((meeting) => String(meeting.id))
  )
  const remoteMeetingIds = new Set(
    getData(KEYS.remoteMeetingIds, []).map((id) => String(id))
  )
  const liveSharedMeetingIds = new Set((sharedMeetings || []).map((meeting) => String(meeting.id)))
  const sharedMeetingsWithoutWorkspaceRows = getData(KEYS.meetings, []).filter((meeting) =>
    meeting.workspaceShared &&
    remoteMeetingIds.has(String(meeting.id)) &&
    liveSharedMeetingIds.has(String(meeting.id)) &&
    !isMeetingPendingDeletion(authUserId, meeting.id) &&
    !workspaceMeetingIds.has(String(meeting.id))
  )
  if (sharedMeetingsWithoutWorkspaceRows.length) {
    rowsByCollection.set('meetings', [
      ...(rowsByCollection.get('meetings') || []),
      ...sharedMeetingsWithoutWorkspaceRows,
    ])
  }

  if (recordSyncs.get(authUserId)?.needsRefresh) return
  withoutRemotePersistence(() => {
    for (const collection of sharedCollections) {
      const key = keyByCollection.get(collection)
      if (!key) continue
      setData(key, withoutLegacyDemoRecords(key, rowsByCollection.get(collection) || []))
    }
  })
}

export const syncSharedWorkspaceRecords = (authUser) => {
  if (!supabase || !authUser?.id) return Promise.resolve([])

  let state = recordSyncs.get(authUser.id)
  if (state) {
    state.needsRefresh = true
    return state.promise
  }

  state = { needsRefresh: false, promise: null }
  state.promise = (async () => {
    do {
      state.needsRefresh = false
      await refreshSharedWorkspaceRecords(authUser.id)
    } while (state.needsRefresh)
  })().finally(() => {
    if (recordSyncs.get(authUser.id) === state) recordSyncs.delete(authUser.id)
  })
  recordSyncs.set(authUser.id, state)
  return state.promise
}

const accountProfile = (authUser, previous = {}) => ({
  ...previous,
  id: authUser.id,
  name: previous.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Workspace user',
  email: authUser.email || previous.email || '',
  role: previous.role ?? null,
  status: previous.status || 'Activated',
  authMethod: 'Email',
  teamId: previous.teamId || '',
  department: previous.department || '',
  phone: previous.phone || '',
  title: previous.title || '',
  lastSeen: new Date().toISOString(),
  createdAt: previous.createdAt || authUser.created_at || new Date().toISOString(),
})

const writeLocalWorkspace = (ownerId, values) => {
  withoutRemotePersistence(() => {
    COLLECTIONS.forEach(([key]) => setData(key, values[key]))
    setData(KEYS.cloudOwner, ownerId)
  })
}

const loadWorkspace = async (authUser) => {
  if (!supabase || !authUser?.id) throw new Error('Supabase account is unavailable.')

  const { data: profileRecord, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', authUser.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profileRecord || profileRecord.status !== 'Activated') {
    throw new Error('The workspace account is unavailable or blocked.')
  }
  const isAdmin = profileRecord.role === 'Admin'
  const { data: records, error } = await supabase
    .from('workspace_records')
    .select('owner_id, collection, record_id, data')
  if (error) throw error

  const rowsByCollection = new Map()
  for (const row of records || []) {
    const current = rowsByCollection.get(row.collection) || []
    current.push(row)
    rowsByCollection.set(row.collection, current)
  }

  const previousOwner = getData(KEYS.cloudOwner, null)
  const shouldImportLocal = (records || []).length === 0 && (!previousOwner || previousOwner === authUser.id)
  const values = {}

  for (const [key, collection] of COLLECTIONS) {
    if (shouldImportLocal) {
      const localValue = getData(key, key === KEYS.settings ? defaultSettings : [])
      values[key] = Array.isArray(localValue)
        ? withoutLegacyDemoRecords(key, localValue).map((record) => sanitizeRecord(key, record))
        : withoutLegacyDemoSettings(localValue)
      continue
    }

    const cloudRows = rowsByCollection.get(collection) || []
    values[key] = key === KEYS.settings
      ? withoutLegacyDemoSettings(cloudRows.find((row) => row.record_id === 'default')?.data || defaultSettings)
      : key === KEYS.teams
        ? []
        : withoutLegacyDemoRecords(key, cloudRows.map((row) => ({
        ...sanitizeRecord(key, row.data),
        ...(sharedCollections.has(collection)
          ? { workspaceOwnerId: row.owner_id }
          : isAdmin && ['companies', 'meetings', 'actionItems'].includes(collection)
          ? { workspaceOwnerId: row.owner_id }
          : {}),
      })))
  }

  const previousUsers = values[KEYS.users]
  const accountEmail = String(authUser.email || '').toLowerCase()
  const existingProfile = previousUsers.find((record) => record.id === authUser.id) ||
    (accountEmail && previousUsers.find((record) => String(record.email || '').toLowerCase() === accountEmail))
  const profile = {
    ...accountProfile(authUser, existingProfile),
    role: profileRecord.role,
    status: profileRecord.status,
  }
  values[KEYS.users] = [
    profile,
    ...previousUsers.filter((record) =>
      record.id !== authUser.id &&
      (!accountEmail || String(record.email || '').toLowerCase() !== accountEmail)
    ),
  ]

  if (shouldImportLocal) {
    await Promise.all(COLLECTIONS.map(([key]) =>
      persistCollectionForUser(authUser.id, key, values[key])
    ))
  } else if (!previousUsers.some((record) => record.id === authUser.id)) {
    await persistCollectionForUser(authUser.id, KEYS.users, values[KEYS.users], previousUsers)
  }

  writeLocalWorkspace(authUser.id, values)
  return profile
}

export const loadWorkspaceForUser = (authUser) => {
  if (!authUser?.id) return Promise.reject(new Error('Supabase account is unavailable.'))
  const pending = pendingLoads.get(authUser.id)
  if (pending) return pending
  const loading = loadWorkspace(authUser).finally(() => pendingLoads.delete(authUser.id))
  pendingLoads.set(authUser.id, loading)
  return loading
}
