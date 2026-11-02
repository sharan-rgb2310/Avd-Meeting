const teamMemberIds = (team) => Array.isArray(team?.memberIds) ? team.memberIds : []

export const availableTeamMembers = (users = [], teams = [], currentTeam) => {
  const currentMemberIds = new Set([
    ...teamMemberIds(currentTeam),
    ...(currentTeam?.leadId ? [currentTeam.leadId] : []),
  ].map(String))

  return users.filter((user) => {
    const userId = String(user.id)
    if (currentMemberIds.has(userId) || (currentTeam && String(user.teamId || '') === String(currentTeam.id))) {
      return true
    }

    if (user.teamId && String(user.teamId) !== String(currentTeam?.id || '')) return false

    return !teams.some((team) =>
      String(team.id) !== String(currentTeam?.id || '')
      && (teamMemberIds(team).some((id) => String(id) === userId) || String(team.leadId || '') === userId)
    )
  })
}
