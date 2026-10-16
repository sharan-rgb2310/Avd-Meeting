import { supabase } from '../utils/supabase'

export const sendMeetingInvitations = async (
  meeting,
  recipients,
  action = 'created',
  options = {}
) => {
  if (!meeting || !Array.isArray(recipients) || recipients.length === 0) return { ok: false, skipped: true }
  if (!supabase) return { ok: false, skipped: true, reason: 'supabase_not_configured' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, skipped: true, reason: 'supabase_auth_required' }

  const { data, error } = await supabase.functions.invoke('send-meeting-invitations', {
    body: {
      meeting,
      recipients,
      action,
      previous: options.previous ?? null,
      note: options.note,
      createdByName: options.createdByName,
    },
  })

  if (error) throw error
  return { ok: true, data }
}