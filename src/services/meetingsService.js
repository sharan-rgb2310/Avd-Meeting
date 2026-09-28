import { KEYS, getData, addItem, updateItem, deleteItem, findItem, setData } from './storageService'
import { uid } from '../utils/format'
import { logActivity } from './dashboardService'
import { sendMeetingInvitations } from './emailNotificationService'

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
  const users = getData(KEYS.users, [])
  const recipients = (meeting.participants || [])
    .map((participant) => users.find((user) => user.id === participant.userId)?.email)
    .filter(Boolean)
  if (recipients.length) {
    sendMeetingInvitations(meeting, recipients).catch((error) => {
      console.warn('Meeting invitation email was not sent:', error.message)
    })
  }
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

export const removeMeeting = (id) => {
  const meeting = getMeeting(id)
  deleteItem(KEYS.meetings, id)
  setData(
    KEYS.actionItems,
    getData(KEYS.actionItems, []).map((a) => (a.meetingId === id ? { ...a, meetingId: '' } : a))
  )
  setData(KEYS.documents, getData(KEYS.documents, []).filter((d) => d.meetingId !== id))
  if (meeting) logActivity(`${meeting.title} was deleted`, 'meeting', id, meeting.companyId)
  return id
}

export const rescheduleMeeting = (id, { date, startTime, reason }, actorName = 'Someone') => {
  const updated = updateMeeting(id, {
    date,
    startTime,
    status: 'Rescheduled',
    rescheduleReason: reason,
  })
  if (updated) logActivity(`${actorName} rescheduled ${updated.title}`, 'meeting', id, updated.companyId)
  return updated
}

export const setMeetingStatus = (id, status, actorName = 'Someone') => {
  const updated = updateMeeting(id, { status })
  if (updated) logActivity(`${actorName} set ${updated.title} to ${status}`, 'meeting', id, updated.companyId)
  return updated
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
