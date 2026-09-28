import { supabase } from '../utils/supabase'
import { KEYS, getData, setData } from './storageService'

const toMeeting = (row) => ({
  id: row.id,
  ref: row.ref,
  title: row.title,
  companyId: row.company_id || '',
  companyName: row.company_name || '',
  teamId: row.team_id || '',
  department: row.department || '',
  date: row.date,
  startTime: row.start_time?.slice(0, 5) || '',
  endTime: row.end_time?.slice(0, 5) || '',
  status: row.status,
  type: row.type,
  location: row.location || '',
  meetingLink: row.meeting_link || '',
  responsibleId: row.responsible_id || '',
  createdBy: row.created_by || '',
  agenda: row.agenda || '',
  notes: row.notes || '',
  decisions: row.decisions || '',
  actionItemsText: row.action_items_text || '',
  remarks: row.remarks || '',
  rescheduleReason: row.reschedule_reason || '',
  participants: (row.meeting_participants || []).map((participant) => ({
    userId: participant.user_id,
    type: participant.participant_type,
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

let syncPromise = null

export const syncRemoteMeetings = async () => {
  if (!supabase) return []
  if (!syncPromise) {
    syncPromise = (async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_participants(user_id, participant_type)')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      const remoteMeetings = (data || []).map(toMeeting)
      const remoteIds = new Set(remoteMeetings.map((meeting) => meeting.id))
      const previouslyRemoteIds = new Set(getData(KEYS.remoteMeetingIds, []))
      const localOnlyMeetings = getData(KEYS.meetings, []).filter(
        (meeting) => !previouslyRemoteIds.has(meeting.id) && !remoteIds.has(meeting.id)
      )
      setData(KEYS.meetings, [...remoteMeetings, ...localOnlyMeetings])
      setData(KEYS.remoteMeetingIds, [...remoteIds])
      return data || []
    })().finally(() => {
      syncPromise = null
    })
  }
  return syncPromise
}

export const subscribeToRemoteMeetings = () => {
  if (!supabase) return () => {}
  let active = true

  syncRemoteMeetings().catch((error) => {
    if (active) console.warn('Supabase meeting sync failed:', error.message)
  })

  const channel = supabase
    .channel('avdynamics-meetings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
      syncRemoteMeetings().catch((error) => {
        if (active) console.warn('Supabase meeting realtime refresh failed:', error.message)
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_participants' }, () => {
      syncRemoteMeetings().catch((error) => {
        if (active) console.warn('Supabase participant realtime refresh failed:', error.message)
      })
    })
    .subscribe()

  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}