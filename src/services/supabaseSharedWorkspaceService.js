import { KEYS, getData, setData, withoutRemotePersistence } from './storageService'
import { withoutLegacyDemoRecords } from '../data/legacyDemoData'
import { supabase } from '../utils/supabase'
import {
  isMeetingPendingDeletion,
  syncSharedWorkspaceRecords,
} from './supabaseWorkspaceService'
import { canUserViewMeeting } from '../utils/meetingAccess'

const directorySyncs = new Map()
const meetingSyncs = new Map()
const teamSyncs = new Map()

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
      createdBy: row.data.createdBy || '',
      workspaceShared: true,
    }))

    withoutRemotePersistence(() => {
      setData(KEYS.teams, remoteTeams)
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
  let state = meetingSyncs.get(authUser.id)
  if (state) {
    state.needsRefresh = true
    return state.promise
  }

  state = { needsRefresh: false, promise: null }
  state.promise = (async () => {
    let remoteMeetings = []
    do {
      state.needsRefresh = false
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
      remoteMeetings = (data || []).filter((row) =>
        canUserViewMeeting({ ...row.data, owner_id: row.owner_id, participant_ids: row.participant_ids }, authUser.id)
        && !isMeetingPendingDeletion(authUser.id, row.id)
      ).map((row) => {
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
        canUserViewMeeting(meeting, authUser.id) &&
        !remoteIds.has(String(meeting.id)) &&
        !isMeetingPendingDeletion(authUser.id, meeting.id) &&
        (workspaceMeetingIds.has(String(meeting.id)) || !previouslyRemoteIds.has(String(meeting.id)))
      )

      if (state.needsRefresh) continue
      withoutRemotePersistence(() => {
        setData(KEYS.meetings, [...remoteMeetings, ...localMeetings])
        setData(KEYS.remoteMeetingIds, [...remoteIds])
      })
    } while (state.needsRefresh)
    return remoteMeetings
  })().finally(() => {
    if (meetingSyncs.get(authUser.id) === state) meetingSyncs.delete(authUser.id)
  })

  meetingSyncs.set(authUser.id, state)
  return state.promise
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
