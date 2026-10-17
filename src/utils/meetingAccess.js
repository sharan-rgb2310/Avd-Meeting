const participantIds = (participants) => {
  if (!Array.isArray(participants)) return []
  return participants
    .map((participant) => (
      typeof participant === 'string'
        ? participant
        : participant?.userId || participant?.user_id
    ))
    .filter(Boolean)
    .map(String)
}

export const canUserViewMeeting = (meeting, userId) => {
  if (!meeting || !userId) return false

  const currentUserId = String(userId)
  const ownerId = meeting.owner_id
    || meeting.ownerId
    || meeting.workspaceOwnerId
    || meeting.sharedOwnerId
    || meeting.createdBy
    || meeting.created_by

  return String(ownerId || '') === currentUserId
    || [
      ...participantIds(meeting.participant_ids),
      ...participantIds(meeting.participants),
    ].includes(currentUserId)
}

export const canUserViewWorkspaceMeeting = (row, userId) =>
  Boolean(row && (
    String(row.owner_id || '') === String(userId || '')
    || canUserViewMeeting(row.data, userId)
  ))
