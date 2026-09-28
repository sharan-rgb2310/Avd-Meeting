import { KEYS, getData, setData, addItem, deleteItem } from './storageService'
import { defaultSettings } from '../data/seedData'
import { uid } from '../utils/format'

export const listNotifications = () => getData(KEYS.notifications, [])

export const unreadCount = () => listNotifications().filter((n) => !n.read).length

export const pushNotification = (values) =>
  addItem(KEYS.notifications, {
    id: uid('ntf'),
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
    ...values,
  })

export const markRead = (id) =>
  setData(KEYS.notifications, listNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)))

export const markAllRead = () =>
  setData(KEYS.notifications, listNotifications().map((n) => ({ ...n, read: true })))

export const removeNotification = (id) => deleteItem(KEYS.notifications, id)

export const getSettings = () => {
  const stored = getData(KEYS.settings, null)
  if (!stored) return defaultSettings
  return {
    ...defaultSettings,
    ...stored,
    notifications: { ...defaultSettings.notifications, ...stored.notifications },
    automation: { ...defaultSettings.automation, ...stored.automation },
    channels: { ...defaultSettings.channels, ...stored.channels },
    auth: { ...defaultSettings.auth, ...stored.auth, methods: { ...defaultSettings.auth.methods, ...stored.auth?.methods } },
    templates: stored.templates || defaultSettings.templates,
  }
}

export const saveSettings = (patch) => {
  const next = { ...getSettings(), ...patch }
  setData(KEYS.settings, next)
  return next
}

export const saveSection = (section, patch) => {
  const current = getSettings()
  return saveSettings({ [section]: { ...current[section], ...patch } })
}
