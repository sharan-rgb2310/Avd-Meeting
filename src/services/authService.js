import { KEYS, getData, setData, clearData, session, findItem } from './storageService'

const AUTH_KEY = KEYS.auth

export const DEMO_CREDENTIALS = { email: 'admin@avdynamics.com', password: 'Admin@123' }

const toSession = (user, remember) => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  remember,
  signedInAt: new Date().toISOString(),
})

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

export const login = ({ email, password, remember = false }) => {
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

// Creates a workspace account from the Sign Up page and signs the new user in.
// This mirrors login(): it talks only to the existing local persistence layer
// (storageService), the same "backend" login()/changePassword() already use.
export const signUp = ({ name, email, password }) => {
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
  setData(KEYS.users, [user, ...users])
  const payload = toSession(user, true)
  setData(AUTH_KEY, payload)
  session.remove(AUTH_KEY)
  return { ok: true, session: payload, user }
}

export const logout = () => {
  clearData(AUTH_KEY)
  session.remove(AUTH_KEY)
}

export const requestPasswordReset = (email) => {
  const users = getData(KEYS.users, [])
  const exists = users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())
  return { ok: true, matched: exists }
}

export const changePassword = (userId, { current, next }) => {
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
