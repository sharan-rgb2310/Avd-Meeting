import { KEYS, addItem, deleteItem, findItem, getData, resetWorkspace, updateItem } from './storageService'
import { uid } from '../utils/format'
import { syncUserDirectory } from './supabaseSharedWorkspaceService'
import { supabase } from '../utils/supabase'
import { getCurrentSession } from './authService'

const invokeUserFunction = async (body) => {
  const { data, error } = await supabase.functions.invoke('manage-workspace-user', { body })
  if (error) {
    let serverMessage
    if (error.context && typeof error.context.json === 'function') {
      try {
        serverMessage = (await error.context.json())?.error
      } catch {
        serverMessage = undefined
      }
    }
    throw new Error(serverMessage || error.message || 'The account request failed.')
  }
  if (data?.error) throw new Error(data.error)
  return data
}

const requireCurrentAccount = async (id) => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user || data.user.id !== id) throw new Error('You can only manage your own account.')
  return data.user
}

const normalizeRole = (value) => {
  if (typeof value !== 'string') throw new Error('Enter a role.')
  const role = value.trim()
  if (role.length > 80) throw new Error('Role must be 80 characters or fewer.')
  if (!role) return null
  return role.toLowerCase() === 'admin' ? 'Admin' : role
}

const guardLocalAdminChange = (userId, role) => {
  const users = listUsers()
  const current = users.find((user) => user.id === userId)
  const currentSession = getCurrentSession()
  if (currentSession?.userId === userId && current?.role !== 'Admin' && role === 'Admin') {
    throw new Error('Only an existing administrator can assign Admin access from Profile settings.')
  }
  if (role === 'Admin' && current?.role !== 'Admin' && users.filter((user) => user.role === 'Admin').length >= 3) {
    throw new Error('A maximum of three workspace administrators is allowed.')
  }
  if (
    current?.role === 'Admin' &&
    current.status === 'Activated' &&
    role !== 'Admin' &&
    !users.some((user) => user.id !== userId && user.role === 'Admin' && user.status === 'Activated')
  ) {
    throw new Error('At least one active workspace administrator must remain.')
  }
}

const withLocalRole = (userId, patch) => {
  if (!Object.prototype.hasOwnProperty.call(patch, 'role')) return patch
  const role = normalizeRole(patch.role)
  guardLocalAdminChange(userId, role)
  return { ...patch, role }
}

export const listUsers = () => getData(KEYS.users, [])
export const getUser = (id) => findItem(KEYS.users, id)

export const createUser = async (values) => {
  if (supabase) {
    await invokeUserFunction({
      action: 'inviteUser',
      name: values.name,
      email: values.email,
      role: values.role,
      department: values.department,
      title: values.title,
      phone: values.phone,
    })
    await syncUserDirectory()
    return true
  }

  const role = normalizeRole(values.role)
  guardLocalAdminChange(null, role)
  return addItem(KEYS.users, {
    id: uid('usr'),
    status: 'Invited',
    authMethod: 'Email',
    lastSeen: null,
    createdAt: new Date().toISOString(),
    ...values,
    role,
  })
}

export const updateUser = async (id, patch) => {
  if (supabase) {
    await requireCurrentAccount(id)
    const { profile } = await invokeUserFunction({
      action: 'updateSelf',
      name: patch.name,
      role: patch.role,
      department: patch.department,
      title: patch.title,
      phone: patch.phone,
    })
    updateItem(KEYS.users, id, {
      name: profile.name,
      role: profile.role,
      status: profile.status,
      department: profile.department || '',
      title: profile.title || '',
      phone: profile.phone || '',
      email: profile.email,
      isAuthAccount: true,
      workspaceShared: true,
    })
    await syncUserDirectory()
    return findItem(KEYS.users, id)
  }
  return updateItem(KEYS.users, id, withLocalRole(id, patch))
}

export const updateManagedUser = async (id, patch) => {
  if (!supabase) return updateItem(KEYS.users, id, withLocalRole(id, patch))
  const { profile } = await invokeUserFunction({
    action: 'updateUser',
    userId: id,
    name: patch.name,
    role: patch.role,
    department: patch.department,
    title: patch.title,
    phone: patch.phone,
  })
  updateItem(KEYS.users, id, {
    name: profile.name,
    role: profile.role,
    status: profile.status,
    department: profile.department || '',
    title: profile.title || '',
    phone: profile.phone || '',
    email: profile.email,
    isAuthAccount: true,
    workspaceShared: true,
  })
  await syncUserDirectory()
  return findItem(KEYS.users, id)
}

export const setUserBlocked = async (id, blocked) => {
  if (!supabase) throw new Error('Admin account controls require a Supabase connection.')
  await invokeUserFunction({
    action: blocked ? 'blockUser' : 'unblockUser',
    userId: id,
  })
  await syncUserDirectory()
}

export const removeManagedUser = async (id) => {
  if (!supabase) return deleteItem(KEYS.users, id)
  await invokeUserFunction({ action: 'deleteUser', userId: id })
  await syncUserDirectory()
}

export const removeUser = async (id) => {
  if (supabase) {
    await requireCurrentAccount(id)
    const result = await invokeUserFunction({ action: 'deleteSelf' })
    resetWorkspace()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    return result
  }
  return deleteItem(KEYS.users, id)
}

export const userMap = () =>
  Object.fromEntries(listUsers().map((u) => [u.id, u]))
