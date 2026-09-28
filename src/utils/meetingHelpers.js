// Display helpers shared by every screen that shows a meeting.
// They keep older saved meetings (which have a companyId / teamId but no
// companyName / department) rendering correctly next to newly created ones.

export const MANUAL_COMPANY = '__manual__'

export const meetingCompanyName = (meeting, companies = []) =>
  companies.find((c) => c.id === meeting?.companyId)?.name || meeting?.companyName || ''

export const meetingDepartment = (meeting, teams = []) =>
  meeting?.department || teams.find((t) => t.id === meeting?.teamId)?.department || ''

export const userName = (id, users = []) => users.find((u) => u.id === id)?.name || ''
