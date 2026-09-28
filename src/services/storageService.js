/**
 * Centralised persistence layer.
 * Every feature service talks to this module — never to window.localStorage directly.
 * Swapping LocalStorage for a REST client later means rewriting only this file
 * plus the async signatures in the feature services.
 */

export const KEYS = {
  auth: 'avdynamics_auth',
  users: 'avdynamics_users',
  companies: 'avdynamics_companies',
  meetings: 'avdynamics_meetings',
  remoteMeetingIds: 'avdynamics_remote_meeting_ids',
  actionItems: 'avdynamics_action_items',
  documents: 'avdynamics_documents',
  teams: 'avdynamics_teams',
  notifications: 'avdynamics_notifications',
  settings: 'avdynamics_settings',
  activity: 'avdynamics_activity',
}

const memory = new Map()

const driver = () => {
  try {
    const probe = '__avd__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

const read = (key) => {
  const store = driver()
  if (!store) return memory.has(key) ? memory.get(key) : null
  const raw = store.getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const write = (key, value) => {
  const store = driver()
  memory.set(key, value)
  if (store) store.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('avdynamics:store', { detail: { key } }))
  return value
}

export const getData = (key, fallback = []) => {
  const value = read(key)
  return value === null ? fallback : value
}

export const setData = (key, value) => write(key, value)

export const addItem = (key, item) => {
  const list = getData(key, [])
  const next = [item, ...list]
  write(key, next)
  return item
}

export const updateItem = (key, id, patch) => {
  const list = getData(key, [])
  let updated = null
  const next = list.map((entry) => {
    if (entry.id !== id) return entry
    updated = typeof patch === 'function' ? patch(entry) : { ...entry, ...patch }
    return updated
  })
  write(key, next)
  return updated
}

export const deleteItem = (key, id) => {
  const list = getData(key, [])
  write(key, list.filter((entry) => entry.id !== id))
  return id
}

export const findItem = (key, id) => getData(key, []).find((entry) => entry.id === id) || null

export const clearData = (key) => {
  const store = driver()
  memory.delete(key)
  if (store) store.removeItem(key)
  window.dispatchEvent(new CustomEvent('avdynamics:store', { detail: { key } }))
}

export const resetWorkspace = () => {
  Object.values(KEYS).forEach(clearData)
}

/** Session-scoped storage, used when "Remember me" is off. */
export const session = {
  get(key, fallback = null) {
    try {
      const raw = window.sessionStorage.getItem(key)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable — auth stays in memory for this tab */
    }
    return value
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      /* no-op */
    }
  },
}

export const initializeSeedData = (seed) => {
  Object.entries(seed).forEach(([key, value]) => {
    if (read(key) === null) write(key, value)
  })
}
