import { KEYS, getData, setData } from './storageService'
import { addDays, todayKey, uid } from '../utils/format'

export const logActivity = (message, entity, entityId, companyId = '') => {
  const list = getData(KEYS.activity, [])
  const entry = { id: uid('atv'), message, entity, entityId, companyId, createdAt: new Date().toISOString() }
  setData(KEYS.activity, [entry, ...list].slice(0, 120))
  return entry
}

export const listActivity = () => getData(KEYS.activity, [])

export const getDashboardStats = () => {
  const meetings = getData(KEYS.meetings, [])
  const actionItems = getData(KEYS.actionItems, [])
  const companies = getData(KEYS.companies, [])
  const today = todayKey()

  const completed = meetings.filter((m) => m.status === 'Completed')

  return {
    totalMeetings: meetings.length,
    meetingsToday: meetings.filter((m) => m.date === today && m.status !== 'Cancelled').length,
    upcomingMeetings: meetings.filter((m) => m.date > today && ['Scheduled', 'Rescheduled', 'On Hold'].includes(m.status)).length,
    completedMeetings: completed.length,
    rescheduledMeetings: meetings.filter((m) => m.status === 'Rescheduled').length,
    pendingFollowUps: completed.filter((m) =>
      actionItems.some((a) => a.meetingId === m.id && a.status !== 'Done')
    ).length,
    pendingActionItems: actionItems.filter((a) => a.status !== 'Done').length,
    totalCompanies: companies.length,
  }
}

/**
 * Live meeting counts for the three dashboard schedule cards.
 * Always derived from the current meetings collection, so it reflects
 * creates, edits, reschedules and cancellations the moment they happen.
 */
export const getMeetingScheduleStats = () => {
  const meetings = getData(KEYS.meetings, [])
  const today = todayKey()
  const tomorrow = addDays(1)

  const isActive = (m) => m.status !== 'Cancelled'

  return {
    today,
    tomorrow,
    todayCount: meetings.filter((m) => m.date === today && isActive(m)).length,
    tomorrowCount: meetings.filter((m) => m.date === tomorrow && isActive(m)).length,
    upcomingCount: meetings.filter((m) => m.date > tomorrow && isActive(m)).length,
  }
}

export const getMeetingsByStatus = () => {
  const meetings = getData(KEYS.meetings, [])
  const counts = meetings.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([status, value]) => ({ status, value }))
}

export const getActionItemCompletion = () => {
  const items = getData(KEYS.actionItems, [])
  const statuses = ['To Do', 'In Progress', 'Blocked', 'Done']
  return statuses.map((status) => ({ status, value: items.filter((i) => i.status === status).length }))
}

export const getMeetingActivity = () => {
  const meetings = getData(KEYS.meetings, [])
  const buckets = []
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({
      month: label,
      meetings: meetings.filter((m) => String(m.date).startsWith(prefix)).length,
      completed: meetings.filter((m) => String(m.date).startsWith(prefix) && m.status === 'Completed').length,
    })
  }
  return buckets
}
