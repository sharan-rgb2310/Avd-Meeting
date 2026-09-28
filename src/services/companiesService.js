import { KEYS, getData, addItem, updateItem, deleteItem, findItem, setData } from './storageService'
import { uid } from '../utils/format'

export const listCompanies = () => getData(KEYS.companies, [])
export const getCompany = (id) => findItem(KEYS.companies, id)

export const createCompany = (values) =>
  addItem(KEYS.companies, {
    id: uid('cmp'),
    status: 'Prospect',
    createdAt: new Date().toISOString(),
    ...values,
  })

export const updateCompany = (id, patch) => updateItem(KEYS.companies, id, patch)

export const removeCompany = (id) => {
  deleteItem(KEYS.companies, id)
  // Keep related records consistent: detach rather than cascade-delete.
  setData(
    KEYS.meetings,
    getData(KEYS.meetings, []).map((m) => (m.companyId === id ? { ...m, companyId: '' } : m))
  )
  setData(
    KEYS.actionItems,
    getData(KEYS.actionItems, []).map((a) => (a.companyId === id ? { ...a, companyId: '' } : a))
  )
  return id
}
