import { KEYS, getData, addItem, updateItem, deleteItem, findItem, setData } from './storageService'
import { uid } from '../utils/format'
import { logActivity } from './dashboardService'
import { sendMeetingInvitations } from './emailNotificationService'
import { persistWorkspaceChange } from './supabaseWorkspaceService'
import { formatDate, formatTime } from '../utils/format'

export const listMeetings = () => getData(KEYS.meetings, [])
export const getMeeting = (id) => findItem(KEYS.meetings, id)

const nextRef = () => {
  const list = listMeetings()
  const max = list.reduce((acc, m) => {
    const n = Number(String(m.ref || '').replace('MTG-', ''))
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `MTG-${String(max + 1).padStart(3, '0')}`
}

// A meeting stores either a companyId (existing company) or a free-text
// companyName. If a typed name matches an existing company, link to that
// company instead of leaving a duplicate name behind.
const resolveCompany = (values) => {
  if (values.companyId) return { ...values, companyName: '' }
  const name = String(values.companyName || '').trim()
  if (!name) return { ...values, companyId: '', companyName: '' }
  const match = getData(KEYS.companies, []).find((c) => String(c.name).trim().toLowerCase() === name.toLowerCase())
  return match ? { ...values, companyId: match.id, companyName: '' } : { ...values, companyId: '', companyName: name }
}

// ================= EMAIL HELPERS (new) =================

// Gets a person's display name
const userName = (u) => u?.name || u?.fullName || u?.email || ''

// Turns the participants into a list of { name, email }
const buildRecipients = (meeting) => {
  const users = getData(KEYS.users, [])
  return (meeting.participants || [])
    .map((p) => users.find((u) => u.id === p.userId))
    .filter((u) => u && u.email)
    .map((u) => ({ name: userName(u), email: u.email }))
}

// Replaces internal IDs with readable names so the email never shows raw IDs
const toEmailMeeting = (meeting) => {
  const users = getData(KEYS.users, [])
  const company = getData(KEYS.companies, []).find((c) => c.id === meeting.companyId)
  const responsible = users.find((u) => u.id === meeting.responsibleId)
  const { companyId, responsibleId, ...rest } = meeting
  return {
    ...rest,
    companyName: company?.name || meeting.companyName || '',
    responsible: userName(responsible),
  }
}

// One place that sends every meeting email. It never breaks the app if it fails.
const sendMeetingEmail = (meeting, action, { previous = null, note = '', createdByName = '' } = {}) => {
  const recipients = buildRecipients(meeting)
  if (!recipients.length) return
  sendMeetingInvitations(toEmailMeeting(meeting), recipients, action, {
    previous: previous ? toEmailMeeting(previous) : null,
    note,
    createdByName,
  }).catch((error) => {
    console.warn(`Meeting ${action} email was not sent:`, error.message)
  })
}

// ================= MEETING FUNCTIONS =================

export const createMeeting = (values, actorName = 'Someone') => {
  const meeting = addItem(KEYS.meetings, {
    id: uid('mtg'),
    ref: nextRef(),
    status: 'Scheduled',
    type: 'Virtual',
    participants: [],
    agenda: '',
    notes: '',
    decisions: '',
    actionItemsText: '',
    remarks: '',
    department: '',
    location: '',
    meetingLink: '',
    responsibleId: '',
    companyName: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...resolveCompany(values),
  })
  logActivity(`${actorName} created ${meeting.title}`, 'meeting', meeting.id, meeting.companyId)

  // CHANGED: sends the "created" email with names
  sendMeetingEmail(meeting, 'created', { createdByName: actorName })

  return meeting
}

export const updateMeeting = (id, patch, actorName) => {
  const touchesCompany = typeof patch === 'object' && ('companyId' in patch || 'companyName' in patch)
  const updated = updateItem(KEYS.meetings, id, (entry) => ({
    ...entry,
    ...(typeof patch === 'function' ? patch(entry) : touchesCompany ? resolveCompany(patch) : patch),
    updatedAt: new Date().toISOString(),
  }))
  if (updated && actorName) {
    logActivity(`${actorName} updated ${updated.title}`, 'meeting', updated.id, updated.companyId)
  }
  return updated
}

export const removeMeeting = async (id) => {
  const meeting = getMeeting(id)
  if (!meeting) return id

  const previousMeetings = getData(KEYS.meetings, [])
  const nextMeetings = previousMeetings.filter((entry) => entry.id !== id)
  await persistWorkspaceChange(KEYS.meetings, nextMeetings, previousMeetings)

  deleteItem(KEYS.meetings, id)
  setData(
    KEYS.actionItems,
    getData(KEYS.actionItems, []).map((a) => (a.meetingId === id ? { ...a, meetingId: '' } : a))
  )
  setData(KEYS.documents, getData(KEYS.documents, []).filter((d) => d.meetingId !== id))
  if (meeting) logActivity(`${meeting.title} was deleted`, 'meeting', id, meeting.companyId)
  return id
}

// CHANGED: sends the "rescheduled" email
export const rescheduleMeeting = async (id, { date, startTime, reason }, actorName = 'Someone') => {
  const existing = getMeeting(id)
  const previous = existing ? { ...existing } : null // copy of the OLD meeting

  const updated = updateMeeting(id, {
    date,
    startTime,
    status: 'Rescheduled',
    rescheduleReason: reason,
  })
  if (updated) {
    await persistWorkspaceChange(KEYS.meetings, getData(KEYS.meetings, []))
    logActivity(
      `${actorName} rescheduled ${updated.title} to ${formatDate(updated.date)} at ${formatTime(updated.startTime)}`,
      'meeting',
      id,
      updated.companyId
    )
    sendMeetingEmail(updated, 'rescheduled', { previous, note: reason })
  }
  return updated
}

// Which statuses send which email (keys are lowercase)
const STATUS_ACTION = {
  cancelled: 'cancelled',
  canceled: 'cancelled',
  'on hold': 'on_hold',
  hold: 'on_hold',
}

// CHANGED: sends cancelled / on hold / resumed emails
export const setMeetingStatus = (id, status, actorName = 'Someone', reason = '') => {
  const existing = getMeeting(id)
  const previous = existing ? { ...existing } : null

  const updated = updateMeeting(id, { status })
  if (updated) {
    logActivity(`${actorName} set ${updated.title} to ${status}`, 'meeting', id, updated.companyId)

    const key = String(status).trim().toLowerCase()
    const prevKey = String(previous?.status || '').trim().toLowerCase()
    let action = STATUS_ACTION[key]
    if (!action && prevKey === 'on hold' && key === 'scheduled') action = 'resumed'

    if (action) sendMeetingEmail(updated, action, { previous, note: reason })
  }
  return updated
}

// NEW: call this after a normal edit (title, agenda, location...) to email "updated"
export const notifyMeetingUpdated = (id, previous, note = '') => {
  const meeting = getMeeting(id)
  if (meeting) sendMeetingEmail(meeting, 'updated', { previous, note })
}

export const addParticipant = (id, userId, type = 'Team Member') =>
  updateMeeting(id, (entry) => ({
    participants: entry.participants.some((p) => p.userId === userId)
      ? entry.participants
      : [...entry.participants, { userId, type }],
  }))

export const removeParticipant = (id, userId) =>
  updateMeeting(id, (entry) => ({
    participants: entry.participants.filter((p) => p.userId !== userId),
  }))