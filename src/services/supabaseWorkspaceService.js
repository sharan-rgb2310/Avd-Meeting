import { supabase } from '../utils/supabase'
import { KEYS, getData, setData, withoutRemotePersistence } from './storageService'
import seed, { defaultSettings } from '../data/seedData'

const COLLECTIONS = [
  [KEYS.users, 'users'],
  [KEYS.companies, 'companies'],
  [KEYS.meetings, 'meetings'],
  [KEYS.actionItems, 'actionItems'],
  [KEYS.documents, 'documents'],
  [KEYS.teams, 'teams'],
  [KEYS.notifications, 'notifications'],
  [KEYS.settings, 'settings'],
  [KEYS.activity, 'activity'],
]

const collectionByKey = new Map(COLLECTIONS)
const pendingWrites = new Map()
const pendingLoads = new Map()
const seedIdsByKey = new Map(
  Object.entries(seed)
    .filter(([, records]) => Array.isArray(records))
    .map(([key, records]) => [key, new Set(records.map((record) => record.id))])
)

const sanitizeRecord = (key, record) => {
  if (key !== KEYS.users) return record
  const safeRecord = { ...record }
  delete safeRecord.password
  return safeRecord
}

const valuesToRows = (ownerId, key, value) => {
  const collection = collectionByKey.get(key)
  if (!collection || value == null) return []
  const records = Array.isArray(value) ? value : [{ id: 'default', value }]
  return records
    .filter((record) => record && record.id != null)
    .map((record) => ({
      owner_id: ownerId,
      collection,
      record_id: String(record.id),
      data: sanitizeRecord(key, Array.isArray(value) ? record : record.value),
    }))
}

const persistCollectionForUser = async (ownerId, key, value, previousValue = null) => {
  const collection = collectionByKey.get(key)
  if (!supabase || !collection) return

  const rows = valuesToRows(ownerId, key, value)
  if (rows.length) {
    const { error } = await supabase
      .from('workspace_records')
      .upsert(rows, { onConflict: 'owner_id,collection,record_id' })
    if (error) throw error
  }

  const nextIds = new Set(rows.map((row) => row.record_id))
  const removedIds = valuesToRows(ownerId, key, previousValue)
    .map((row) => row.record_id)
    .filter((id) => !nextIds.has(id))
  if (removedIds.length) {
    const { error } = await supabase
      .from('workspace_records')
      .delete()
      .eq('owner_id', ownerId)
      .eq('collection', collection)
      .in('record_id', removedIds)
    if (error) throw error
  }
}

export const persistWorkspaceChange = async (key, value, previousValue) => {
  if (!supabase || !collectionByKey.has(key)) return
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const ownerId = data.session?.user?.id
  if (!ownerId) return
  const queueKey = `${ownerId}:${key}`
  const previousWrite = pendingWrites.get(queueKey) || Promise.resolve()
  const currentWrite = previousWrite
    .catch(() => {})
    .then(() => persistCollectionForUser(ownerId, key, value, previousValue))
  pendingWrites.set(queueKey, currentWrite)
  try {
    await currentWrite
  } finally {
    if (pendingWrites.get(queueKey) === currentWrite) pendingWrites.delete(queueKey)
  }
}

const accountProfile = (authUser, previous = {}) => ({
  ...previous,
  id: authUser.id,
  name: previous.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Workspace user',
  email: authUser.email || previous.email || '',
  role: previous.role || 'Team Member',
  status: previous.status || 'Activated',
  authMethod: 'Email',
  teamId: previous.teamId || '',
  department: previous.department || '',
  phone: previous.phone || '',
  title: previous.title || '',
  lastSeen: new Date().toISOString(),
  createdAt: previous.createdAt || authUser.created_at || new Date().toISOString(),
})

const withoutSeedRecords = (key, records) => {
  const seedIds = seedIdsByKey.get(key)
  return (records || [])
    .filter((record) => !seedIds?.has(record.id))
    .map((record) => sanitizeRecord(key, record))
}

const writeLocalWorkspace = (ownerId, values) => {
  withoutRemotePersistence(() => {
    COLLECTIONS.forEach(([key]) => setData(key, values[key]))
    setData(KEYS.cloudOwner, ownerId)
  })
}

const loadWorkspace = async (authUser) => {
  if (!supabase || !authUser?.id) throw new Error('Supabase account is unavailable.')

  const { data: records, error } = await supabase
    .from('workspace_records')
    .select('collection, record_id, data')
    .eq('owner_id', authUser.id)
  if (error) throw error

  const rowsByCollection = new Map()
  for (const row of records || []) {
    const current = rowsByCollection.get(row.collection) || []
    current.push(row)
    rowsByCollection.set(row.collection, current)
  }

  const previousOwner = getData(KEYS.cloudOwner, null)
  const shouldImportLocal = (records || []).length === 0 && (!previousOwner || previousOwner === authUser.id)
  const values = {}

  for (const [key, collection] of COLLECTIONS) {
    if (shouldImportLocal) {
      const localValue = getData(key, key === KEYS.settings ? defaultSettings : [])
      values[key] = Array.isArray(localValue)
        ? withoutSeedRecords(key, localValue)
        : localValue
      continue
    }

    const cloudRows = rowsByCollection.get(collection) || []
    values[key] = key === KEYS.settings
      ? cloudRows.find((row) => row.record_id === 'default')?.data || defaultSettings
      : cloudRows.map((row) => sanitizeRecord(key, row.data))
  }

  const previousUsers = values[KEYS.users]
  const accountEmail = String(authUser.email || '').toLowerCase()
  const existingProfile = previousUsers.find((record) => record.id === authUser.id) ||
    (accountEmail && previousUsers.find((record) => String(record.email || '').toLowerCase() === accountEmail))
  const profile = accountProfile(authUser, existingProfile)
  values[KEYS.users] = [
    profile,
    ...previousUsers.filter((record) =>
      record.id !== authUser.id &&
      (!accountEmail || String(record.email || '').toLowerCase() !== accountEmail)
    ),
  ]

  if (shouldImportLocal) {
    await Promise.all(COLLECTIONS.map(([key]) =>
      persistCollectionForUser(authUser.id, key, values[key])
    ))
  } else if (!previousUsers.some((record) => record.id === authUser.id)) {
    await persistCollectionForUser(authUser.id, KEYS.users, values[KEYS.users], previousUsers)
  }

  writeLocalWorkspace(authUser.id, values)
  return profile
}

export const loadWorkspaceForUser = (authUser) => {
  if (!authUser?.id) return Promise.reject(new Error('Supabase account is unavailable.'))
  const pending = pendingLoads.get(authUser.id)
  if (pending) return pending
  const loading = loadWorkspace(authUser).finally(() => pendingLoads.delete(authUser.id))
  pendingLoads.set(authUser.id, loading)
  return loading
}
