import { getMeetingParticipantIds } from './meetingAccess.js'

export const isTeamMember = (team, userId) => {
  if (!team || !userId) return false
  return (team.memberIds || []).map(String).includes(String(userId))
}

export const canViewActionItem = (item, meeting, userId) => {
  if (!item || !userId) return false
  const currentUserId = String(userId)
  if (String(item.assigneeId || '') === currentUserId) return true

  if (item.meetingId) {
    return Boolean(meeting) && getMeetingParticipantIds(meeting).includes(currentUserId)
  }

  return String(item.createdBy || '') === currentUserId
}

export const canViewDocument = (document, meeting, userId) => {
  if (!document || !userId) return false
  const currentUserId = String(userId)

  if (document.meetingId) {
    return Boolean(meeting) && getMeetingParticipantIds(meeting).includes(currentUserId)
  }

  return String(document.uploadedBy || document.ownerId || '') === currentUserId
    || (document.sharedWith || []).map(String).includes(currentUserId)
}
