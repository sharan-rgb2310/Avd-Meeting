import { KEYS, getData, addItem, updateItem, deleteItem, findItem } from './storageService'
import { uid } from '../utils/format'
import { logActivity } from './dashboardService'

const FILE_DATABASE = 'avdynamics_document_files'
const FILE_STORE = 'files'

const openFileDatabase = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(FILE_DATABASE, 1)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(FILE_STORE)) {
      request.result.createObjectStore(FILE_STORE, { keyPath: 'id' })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Document storage could not be opened.'))
})

const saveFile = async (id, file) => {
  const database = await openFileDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, 'readwrite')
    transaction.objectStore(FILE_STORE).put({ id, file })
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('The file could not be saved.'))
    transaction.onabort = () => reject(transaction.error || new Error('The file could not be saved.'))
  }).finally(() => database.close())
}

export const getDocumentFile = async (id) => {
  const database = await openFileDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, 'readonly')
    const request = transaction.objectStore(FILE_STORE).get(id)
    request.onsuccess = () => resolve(request.result?.file || null)
    request.onerror = () => reject(request.error || new Error('The document file could not be read.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error || new Error('The document file could not be read.'))
    }
  })
}

const removeFile = async (id) => {
  const database = await openFileDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, 'readwrite')
    transaction.objectStore(FILE_STORE).delete(id)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('The document file could not be removed.'))
    transaction.onabort = () => reject(transaction.error || new Error('The document file could not be removed.'))
  }).finally(() => database.close())
}

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

export const createDocument = async (values, actorName = 'Someone') => {
  const id = uid('doc')
  if (values.file) await saveFile(id, values.file)
  const { file, ...metadata } = values
  const doc = addItem(KEYS.documents, {
    id,
    size: 0,
    dataUrl: '',
    createdAt: new Date().toISOString(),
    ...metadata,
    ...(file ? { fileKey: id } : {}),
  })
  logActivity(`${actorName} uploaded ${doc.name}`, 'document', doc.id, doc.companyId)
  return doc
}

export const renameDocument = (id, name) => updateItem(KEYS.documents, id, { name })
export const removeDocument = async (id) => {
  if (findItem(KEYS.documents, id)?.fileKey) await removeFile(id)
  return deleteItem(KEYS.documents, id)
}

/** Documents are metadata-only unless a real file was attached in this browser. */
export const isPreviewable = (doc) =>
  Boolean(doc?.dataUrl || doc?.fileKey) && ['PDF', 'PNG', 'JPG', 'MP4'].includes(doc.type)
