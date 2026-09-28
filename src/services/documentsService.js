import { KEYS, getData, addItem, updateItem, deleteItem, findItem } from './storageService'
import { uid } from '../utils/format'
import { logActivity } from './dashboardService'

const EXTENSION_MAP = {
  pdf: 'PDF', doc: 'DOCX', docx: 'DOCX', xls: 'XLSX', xlsx: 'XLSX', csv: 'XLSX',
  ppt: 'PPTX', pptx: 'PPTX', png: 'PNG', jpg: 'JPG', jpeg: 'JPG', mp4: 'MP4', mov: 'MP4',
}

export const documentTypeFor = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return EXTENSION_MAP[ext] || 'PDF'
}

export const listDocuments = () => getData(KEYS.documents, [])
export const getDocument = (id) => findItem(KEYS.documents, id)

export const createDocument = (values, actorName = 'Someone') => {
  const doc = addItem(KEYS.documents, {
    id: uid('doc'),
    size: 0,
    dataUrl: '',
    createdAt: new Date().toISOString(),
    ...values,
  })
  logActivity(`${actorName} uploaded ${doc.name}`, 'document', doc.id, doc.companyId)
  return doc
}

export const renameDocument = (id, name) => updateItem(KEYS.documents, id, { name })
export const removeDocument = (id) => deleteItem(KEYS.documents, id)

/** Documents are metadata-only unless a real file was attached in this browser. */
export const isPreviewable = (doc) =>
  Boolean(doc?.dataUrl) && ['PDF', 'PNG', 'JPG', 'MP4'].includes(doc.type)
