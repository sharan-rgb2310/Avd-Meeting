import { KEYS, getData, addItem, updateItem, deleteItem, findItem, setData } from './storageService'
import { uid } from '../utils/format'

export const listTeams = () => getData(KEYS.teams, [])
export const getTeam = (id) => findItem(KEYS.teams, id)

export const createTeam = (values) =>
  addItem(KEYS.teams, {
    id: uid('tm'),
    status: 'Active',
    memberIds: [],
    createdAt: new Date().toISOString(),
    ...values,
  })

export const updateTeam = (id, patch) => updateItem(KEYS.teams, id, patch)

export const removeTeam = (id) => {
  deleteItem(KEYS.teams, id)
  setData(
    KEYS.meetings,
    getData(KEYS.meetings, []).map((m) => (m.teamId === id ? { ...m, teamId: '' } : m))
  )
  setData(
    KEYS.users,
    getData(KEYS.users, []).map((u) => (u.teamId === id ? { ...u, teamId: '' } : u))
  )
  return id
}
