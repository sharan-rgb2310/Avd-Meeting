import { KEYS, getData, addItem, updateItem, deleteItem, findItem } from './storageService'
import { uid } from '../utils/format'
import { logActivity } from './dashboardService'

export const listActionItems = () => getData(KEYS.actionItems, [])
export const getActionItem = (id) => findItem(KEYS.actionItems, id)

export const createActionItem = (values, actorName = 'Someone') => {
  const item = addItem(KEYS.actionItems, {
    id: uid('act'),
    status: 'To Do',
    priority: 'Medium',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...values,
  })
  logActivity(`${actorName} created action item ${item.title}`, 'action', item.id, item.companyId)
  return item
}

export const updateActionItem = (id, patch, actorName) => {
  const updated = updateItem(KEYS.actionItems, id, (entry) => ({
    ...entry,
    ...(typeof patch === 'function' ? patch(entry) : patch),
    updatedAt: new Date().toISOString(),
  }))
  if (updated && actorName) {
    logActivity(`${actorName} updated ${updated.title}`, 'action', updated.id, updated.companyId)
  }
  return updated
}

export const removeActionItem = (id) => deleteItem(KEYS.actionItems, id)

export const moveActionItem = (id, status, actorName = 'Someone') => {
  const updated = updateActionItem(id, { status })
  if (updated) logActivity(`${actorName} moved ${updated.title} to ${status}`, 'action', id, updated.companyId)
  return updated
}
