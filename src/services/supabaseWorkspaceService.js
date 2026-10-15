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
const pendingWrites = new Map()
const pendingLoads = new Map()
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

const valuesToRows = (ownerId, key, value) => {
  const collection = collectionByKey.get(key)
  if (!collection || value == null) return []
  const records = Array.isArray(value)
    ? value.filter((record) => key !== KEYS.meetings || !record.workspaceShared)
    : [{ id: 'default', value }]
  return records
    .filter((record) => record && record.id != null)
    .map((record) => ({
      owner_id: record.workspaceOwnerId || ownerId,
      collection,
      record_id: String(record.id),
      data: sanitizeRecord(key, Array.isArray(value) ? record : record.value),
    }))
}

const sharedMeetingRows = (ownerId, meetings, actionItems) =>
  (Array.isArray(meetings) ? meetings : [])
    .filter((meeting) => {
      const isAdmin = getData(KEYS.users, []).some((user) => user.id === ownerId && user.role === 'Admin')
      return isAdmin || meeting?.createdBy === ownerId || meeting?.sharedOwnerId === ownerId
    })
    .map((meeting) => {
      const meetingOwnerId = meeting.sharedOwnerId || meeting.workspaceOwnerId || ownerId
      return {
        id: String(meeting.id),
        owner_id: meetingOwnerId,
        participant_ids: [...new Set((meeting.participants || [])
          .map((participant) => String(participant.userId || ''))
          .filter((participantId) => participantId && participantId !== meetingOwnerId))],
        data: {
          ...sanitizeRecord(KEYS.meetings, meeting),
          companyName: meeting.companyName ||
            getData(KEYS.companies, []).find((company) => company.id === meeting.companyId)?.name ||
            '',
          sharedActionItems: (Array.isArray(actionItems) ? actionItems : [])
            .filter((item) => item.meetingId === meeting.id),
        },
        created_at: meeting.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

const persistCollectionForUser = async (ownerId, key, value, previousValue = null) => {
  const collection = collectionByKey.get(key)
  if (!supabase || !collection) return

  const rows = valuesToRows(ownerId, key, value)
  if (rows.length) {
    const { error } = await supabase
      .from('workspace_records')
      .upsert(rows, { onConflict: 'owner_id,collection,record_id' })
    if (error) throw error
  }

  const nextKeys = new Set(rows.map((row) => `${row.owner_id}:${row.record_id}`))
  const removedRows = valuesToRows(ownerId, key, previousValue)
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

  if (key === KEYS.meetings || key === KEYS.actionItems) {
    const meetings = key === KEYS.meetings ? value : getData(KEYS.meetings, [])
    const actionItems = key === KEYS.actionItems ? value : getData(KEYS.actionItems, [])
    const isAdmin = getData(KEYS.users, []).some((user) => user.id === ownerId && user.role === 'Admin')
    const sharedRows = sharedMeetingRows(ownerId, meetings, actionItems)
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
        return isAdmin || meeting?.createdBy === ownerId || meeting?.sharedOwnerId === ownerId
      })
      if (removedMeetings.length) {
        let deleteQuery = supabase
          .from('shared_meetings')
          .delete()
          .in('id', removedMeetings.map((meeting) => String(meeting.id)))
        if (!isAdmin) deleteQuery = deleteQuery.eq('owner_id', ownerId)
        const { error } = await deleteQuery
        if (error) throw error

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
      : withoutLegacyDemoRecords(key, cloudRows.map((row) => ({
        ...sanitizeRecord(key, row.data),
        ...(isAdmin && ['companies', 'meetings', 'actionItems'].includes(collection)
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
