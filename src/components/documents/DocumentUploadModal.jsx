import { useEffect, useRef, useState } from 'react'
import { Upload, File as FileIcon, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { DOCUMENT_TYPES } from '../../data/seedData'
import { documentTypeFor } from '../../services/documentsService'
import { fileSize } from '../../utils/format'
import { required } from '../../utils/validators'

const MAX_INLINE_BYTES = 4 * 1024 * 1024 // keep LocalStorage well inside quota

const DocumentUploadModal = ({ open, onClose, onSubmit, meetings = [], companies = [], lockedMeetingId }) => {
  const [values, setValues] = useState({ name: '', type: 'PDF', size: 0, meetingId: '', companyId: '', dataUrl: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const meeting = meetings.find((m) => m.id === lockedMeetingId)
    setValues({
      name: '', type: 'PDF', size: 0,
      meetingId: lockedMeetingId || '', companyId: meeting?.companyId || '', dataUrl: '',
    })
    setErrors({})
    setNotice('')
  }, [open, lockedMeetingId, meetings])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => {
      if (key === 'meetingId') {
        const meeting = meetings.find((m) => m.id === value)
        return { ...v, meetingId: value, companyId: meeting?.companyId || v.companyId }
      }
      return { ...v, [key]: value }
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const pickFile = (file) => {
    if (!file) return
    setValues((v) => ({ ...v, name: file.name, type: documentTypeFor(file.name), size: file.size }))
    setErrors((prev) => ({ ...prev, name: undefined }))
    if (file.size > MAX_INLINE_BYTES) {
      setNotice(`${fileSize(file.size)} is too large to keep in the browser, so only the file details are stored.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setValues((v) => ({ ...v, dataUrl: String(reader.result) }))
      setNotice('File kept in this browser, so preview and download work.')
    }
    reader.onerror = () => setNotice('The file could not be read. Its details are still saved.')
    reader.readAsDataURL(file)
  }

  const submit = () => {
    const next = {}
    if (required(values.name)) next.name = 'Choose a file or enter a document name.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload document"
      description="Attach a file to a meeting. Files stay in this browser."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Upload document</Button>
        </>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-slate-50/60 px-4 py-8 transition-colors hover:border-brand hover:bg-brand-50/40"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-card">
            <Upload size={18} aria-hidden="true" />
          </span>
          <span className="text-[13px] font-medium text-ink">Choose a file</span>
          <span className="text-xs text-muted">PDF, DOCX, XLSX, PPTX, PNG, JPG or MP4</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0])}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.mov"
        />

        {values.name && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
            <FileIcon size={16} className="text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{values.name}</p>
              <p className="text-xs text-muted">
                {values.type} · {fileSize(values.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setValues((v) => ({ ...v, name: '', size: 0, dataUrl: '' }))}
              aria-label="Remove selected file"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {notice && <p className="hint">{notice}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Document name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Q3_Strategy.pdf" containerClassName="sm:col-span-2" />
          <Select label="Type" value={values.type} onChange={set('type')} options={DOCUMENT_TYPES} />
          <Select label="Meeting" value={values.meetingId} onChange={set('meetingId')} placeholder="No meeting" options={meetings.map((m) => ({ value: m.id, label: m.title }))} disabled={Boolean(lockedMeetingId)} />
          <Select label="Company" value={values.companyId} onChange={set('companyId')} placeholder="No company" options={companies.map((c) => ({ value: c.id, label: c.name }))} containerClassName="sm:col-span-2" />
        </div>
      </div>
    </Modal>
  )
}

export default DocumentUploadModal
