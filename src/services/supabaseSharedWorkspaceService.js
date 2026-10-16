import { KEYS, getData, setData, withoutRemotePersistence } from './storageService'
import { withoutLegacyDemoRecords } from '../data/legacyDemoData'
import { supabase } from '../utils/supabase'
import { syncSharedWorkspaceRecords } from './supabaseWorkspaceService'

const directorySyncs = new Map()
const meetingSyncs = new Map()
const teamSyncs = new Map()
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

const announceSyncError = (error) => {
  console.warn('Shared workspace could not be refreshed:', error.message)
  window.dispatchEvent(new CustomEvent('avdynamics:sync-error', { detail: { message: error.message } }))
}

export const syncUserDirectory = async () => {
  if (!supabase) return Promise.resolve([])
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const ownerId = sessionData.session?.user?.id
  if (!ownerId) return Promise.resolve([])
  if (directorySyncs.has(ownerId)) return directorySyncs.get(ownerId)

  const syncing = (async () => {
    const { data, error } = await supabase
      .from('user_directory')
      .select('id, email, name, role, status, department, title, created_at')
      .order('name', { ascending: true })
    if (error) throw error

    const existingUsers = withoutLegacyDemoRecords(KEYS.users, getData(KEYS.users, []))
    const directoryUsers = (data || []).map((profile) => {
      const existing = existingUsers.find((user) => user.id === profile.id)
      return {
        ...existing,
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role ?? null,
        status: profile.status || 'Activated',
        authMethod: 'Email',
        teamId: '',
        department: profile.department || '',
        title: profile.title || '',
        phone: existing?.phone || '',
        lastSeen: existing?.lastSeen || null,
        createdAt: profile.created_at,
        isAuthAccount: true,
        workspaceShared: true,
      }
    })
    const directoryIds = new Set(directoryUsers.map((user) => user.id))
    const directoryEmails = new Set(directoryUsers.map((user) => user.email.toLowerCase()))
    const manualUsers = existingUsers.filter((user) =>
      !(user.isAuthAccount || user.workspaceShared) &&
      !directoryIds.has(user.id) &&
      !directoryEmails.has(String(user.email || '').toLowerCase())
    )
    const mergedUsers = [...directoryUsers, ...manualUsers]

    if (JSON.stringify(existingUsers) !== JSON.stringify(mergedUsers)) {
      setData(KEYS.users, mergedUsers)
    }
    return mergedUsers
  })().finally(() => {
    directorySyncs.delete(ownerId)
  })

  directorySyncs.set(ownerId, syncing)
  return syncing
}

export const syncSharedTeams = (authUser) => {
  if (!supabase || !authUser?.id) return Promise.resolve([])
  if (teamSyncs.has(authUser.id)) return teamSyncs.get(authUser.id)

  const syncing = (async () => {
    const { data, error } = await supabase
      .from('shared_teams')
      .select('id, data, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (error) throw error

    const remoteTeams = (data || []).map((row) => ({
      ...row.data,
      id: row.id,
      workspaceShared: true,
    }))
    const remoteIds = new Set(remoteTeams.map((team) => String(team.id)))
    const localTeams = getData(KEYS.teams, []).filter(
      (team) => !team.workspaceShared && !remoteIds.has(String(team.id))
    )

    withoutRemotePersistence(() => {
      setData(KEYS.teams, [...remoteTeams, ...localTeams])
    })
    return remoteTeams
  })().finally(() => {
    teamSyncs.delete(authUser.id)
  })

  teamSyncs.set(authUser.id, syncing)
  return syncing
}

export const syncSharedMeetings = (authUser) => {
  if (!supabase || !authUser?.id) return Promise.resolve([])
  if (meetingSyncs.has(authUser.id)) return meetingSyncs.get(authUser.id)

  const syncing = (async () => {
    const storedMeetings = getData(KEYS.meetings, [])
    const ownedMeetings = storedMeetings.filter((meeting) => meeting.createdBy === authUser.id)
    const { data: existingRows, error: existingError } = await supabase
      .from('shared_meetings')
      .select('id, participant_ids, data')
      .eq('owner_id', authUser.id)
    if (existingError) throw existingError
    const existingById = new Map((existingRows || []).map((row) => [row.id, row]))
    const rowsToPublish = ownedMeetings.map((meeting) => {
      const { workspaceShared, sharedOwnerId, workspaceOwnerId, ...data } = meeting
      delete data.sharedActionItems
      return {
        id: String(meeting.id),
        owner_id: authUser.id,
        participant_ids: [...new Set((meeting.participants || [])
          .map((participant) => String(participant.userId || ''))
          .filter((participantId) => participantId && participantId !== authUser.id))],
        data: {
          ...data,
          companyName: meeting.companyName ||
            getData(KEYS.companies, []).find((company) => company.id === meeting.companyId)?.name ||
            '',
        },
        created_at: meeting.createdAt || new Date().toISOString(),
        updated_at: meeting.updatedAt || new Date().toISOString(),
      }
    })

    const rowsToSync = uniqueBy(
      rowsToPublish.filter((row) => {
        const existing = existingById.get(row.id)
        return !existing ||
          stableJson(existing.participant_ids || []) !== stableJson(row.participant_ids) ||
          stableJson(existing.data || {}) !== stableJson(row.data)
      }),
      (row) => row.id
    )
    if (rowsToSync.length) {
      const { error } = await supabase
        .from('shared_meetings')
        .upsert(rowsToSync, { onConflict: 'id' })
      if (error) throw error
    }

    const { data, error } = await supabase
      .from('shared_meetings')
      .select('id, owner_id, participant_ids, data, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (error) throw error

    const operationalMeetings = new Map(
      getData(KEYS.meetings, [])
        .filter((meeting) => meeting.workspaceOwnerId)
        .map((meeting) => [String(meeting.id), meeting])
    )
    const remoteMeetings = (data || []).map((row) => {
      const operationalMeeting = operationalMeetings.get(String(row.id))
      return {
        ...row.data,
        ...operationalMeeting,
        id: row.id,
        participants: operationalMeeting?.participants || row.data.participants || [],
        workspaceShared: true,
        sharedOwnerId: row.owner_id,
      }
    })
    const remoteIds = new Set(remoteMeetings.map((meeting) => meeting.id))
    const previouslyRemoteIds = new Set(getData(KEYS.remoteMeetingIds, []))
    const { data: workspaceRows, error: workspaceRowsError } = await supabase
      .from('workspace_records')
      .select('record_id')
      .eq('collection', 'meetings')
    if (workspaceRowsError) throw workspaceRowsError
    const workspaceMeetingIds = new Set((workspaceRows || []).map((row) => String(row.record_id)))
    const localMeetings = getData(KEYS.meetings, []).filter((meeting) =>
      !remoteIds.has(String(meeting.id)) &&
      (workspaceMeetingIds.has(String(meeting.id)) || !previouslyRemoteIds.has(String(meeting.id)))
    )

    withoutRemotePersistence(() => {
      setData(KEYS.meetings, [...remoteMeetings, ...localMeetings])
      setData(KEYS.remoteMeetingIds, [...remoteIds])
    })
    return remoteMeetings
  })().finally(() => {
    meetingSyncs.delete(authUser.id)
  })

  meetingSyncs.set(authUser.id, syncing)
  return syncing
}

export const subscribeToSharedWorkspace = (authUser) => {
  if (!supabase || !authUser?.id) return () => {}

  const refresh = (sync) => {
    sync().catch(announceSyncError)
  }
  const channel = supabase
    .channel(`avdynamics-shared-workspace-${authUser.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      refresh(syncUserDirectory)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_meetings' }, () => {
      refresh(() => syncSharedMeetings(authUser))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_teams' }, () => {
      refresh(() => syncSharedTeams(authUser))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_records' }, (payload) => {
      const collection = payload.new?.collection || payload.old?.collection
      if (['companies', 'meetings', 'actionItems', 'documents', 'activity'].includes(collection)) {
        refresh(() => syncSharedWorkspaceRecords(authUser))
      }
    })
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        announceSyncError(error || new Error(`Realtime subscription failed: ${status}`))
      }
    })
  const refreshInterval = window.setInterval(() => {
    refresh(syncUserDirectory)
    refresh(() => syncSharedMeetings(authUser))
    refresh(() => syncSharedTeams(authUser))
    refresh(() => syncSharedWorkspaceRecords(authUser))
  }, 60_000)

  return () => {
    window.clearInterval(refreshInterval)
    supabase.removeChannel(channel)
  }
}
