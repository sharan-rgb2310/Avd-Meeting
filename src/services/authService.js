import { KEYS, getData, setData, clearData, session, findItem } from './storageService'
import seed from '../data/seedData'
import { supabase } from '../utils/supabase'

const AUTH_KEY = KEYS.auth

const signUpError = (error) => {
  if (error.code === 'email_address_invalid' || /invalid email|email address.*invalid/i.test(error.message)) {
    return { ok: false, field: 'email', error: 'Enter a valid email address.' }
  }
  if (error.code === 'user_already_exists' || /already registered|user already exists/i.test(error.message)) {
    return { ok: false, field: 'email', error: 'An account with this email already exists.' }
  }
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
    return { ok: false, error: 'Too many signup attempts. Please wait a few minutes and try again.' }
  }
  if (error.code === 'weak_password') {
    return { ok: false, field: 'password', error: error.message }
  }
  return { ok: false, error: error.message || 'Account creation failed. Please try again.' }
}

export const DEMO_CREDENTIALS = { email: 'admin@avdynamics.com', password: 'Admin@123' }

const toSession = (user, remember) => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  remember,
  signedInAt: new Date().toISOString(),
})

const removeSeedRecords = () => {
  Object.entries(seed).forEach(([key, records]) => {
    if (!Array.isArray(records)) return
    const seedIds = new Set(records.map((record) => record.id))
    if (!seedIds.size) return
    setData(key, getData(key, []).filter((record) => !seedIds.has(record.id)))
  })
}

export const getCurrentSession = () => {
  const persisted = getData(AUTH_KEY, null)
  if (persisted) return persisted
  return session.get(AUTH_KEY, null)
}

export const getCurrentUser = () => {
  const current = getCurrentSession()
  if (!current) return null
  return findItem(KEYS.users, current.userId)
}

export const login = async ({ email, password, remember = false }) => {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password,
    })
    if (error) return { ok: false, error: error.message || 'Sign in failed. Please try again.' }
    return { ok: true, session: data.session, user: data.user }
  }

  const users = getData(KEYS.users, [])
  const user = users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())
  if (!user || user.password !== password) {
    return { ok: false, error: 'Invalid email or password.' }
  }
  if (user.status === 'Inactive') {
    return { ok: false, error: 'This account is inactive. Ask an admin to reactivate it.' }
  }
  const payload = toSession(user, remember)
  if (remember) {
    setData(AUTH_KEY, payload)
    session.remove(AUTH_KEY)
  } else {
    session.set(AUTH_KEY, payload)
    clearData(AUTH_KEY)
  }
  setData(
    KEYS.users,
    users.map((u) => (u.id === user.id ? { ...u, lastSeen: new Date().toISOString() } : u))
  )
  return { ok: true, session: payload, user }
}

// Uses Supabase Auth when configured; local credentials are only for demo mode.
export const signUp = async ({ name, email, password }) => {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) return signUpError(error)
    if (data.user?.identities?.length === 0) {
      return { ok: false, field: 'email', error: 'An account with this email already exists.' }
    }
    if (!data.session) return { ok: false, error: 'Supabase did not start a session. Please try signing in.' }
    return { ok: true, session: data.session, user: data.user }
  }

  const users = getData(KEYS.users, [])
  const normalizedEmail = String(email).trim().toLowerCase()
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: 'An account with this email already exists.' }
  }
  const user = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'Team Member',
    status: 'Activated',
    authMethod: 'Email',
    teamId: '',
    department: '',
    phone: '',
    title: '',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  removeSeedRecords()
  setData(KEYS.users, [user, ...getData(KEYS.users, [])])
  const payload = toSession(user, true)
  setData(AUTH_KEY, payload)
  session.remove(AUTH_KEY)
  return { ok: true, session: payload, user }
}

export const logout = async () => {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    clearData(AUTH_KEY)
    session.remove(AUTH_KEY)
    return { ok: !error, error: error?.message }
  }
  clearData(AUTH_KEY)
  session.remove(AUTH_KEY)
  return { ok: true }
}

export const requestPasswordReset = (email) => {
  const users = getData(KEYS.users, [])
  const exists = users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())
  return { ok: true, matched: exists }
}

export const changePassword = async (userId, { current, next }) => {
  if (supabase) {
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user || data.user.id !== userId) return { ok: false, error: 'Account not found.' }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: data.user.email, password: current })
    if (reauthError) return { ok: false, error: 'Current password is incorrect.' }
    const { error } = await supabase.auth.updateUser({ password: next })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  const user = findItem(KEYS.users, userId)
  if (!user) return { ok: false, error: 'Account not found.' }
  if (user.password !== current) return { ok: false, error: 'Current password is incorrect.' }
  if (!next || next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' }
  setData(
    KEYS.users,
    getData(KEYS.users, []).map((u) => (u.id === userId ? { ...u, password: next } : u))
  )
  return { ok: true }
}
