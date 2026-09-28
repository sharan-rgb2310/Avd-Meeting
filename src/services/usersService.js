import { KEYS, getData, addItem, updateItem, deleteItem, findItem } from './storageService'
import { uid } from '../utils/format'

export const listUsers = () => getData(KEYS.users, [])
export const getUser = (id) => findItem(KEYS.users, id)

export const createUser = (values) =>
  addItem(KEYS.users, {
    id: uid('usr'),
    password: 'Demo@123',
    status: 'Invited',
    authMethod: 'Email',
    lastSeen: null,
    createdAt: new Date().toISOString(),
    ...values,
  })

export const updateUser = (id, patch) => updateItem(KEYS.users, id, patch)
export const removeUser = (id) => deleteItem(KEYS.users, id)

export const userMap = () =>
  Object.fromEntries(listUsers().map((u) => [u.id, u]))
