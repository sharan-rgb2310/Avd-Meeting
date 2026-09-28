import { useMemo, useState } from 'react'
import { Download, Edit, Eye, FileText, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Avatar from '../components/ui/Avatar'
import Pagination from '../components/ui/Pagination'
import Dropdown, { DropdownDivider, DropdownItem } from '../components/ui/Dropdown'
import DocumentUploadModal from '../components/documents/DocumentUploadModal'
import { KEYS, getData } from '../services/storageService'
import { createDocument, isPreviewable, removeDocument, renameDocument } from '../services/documentsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { DOCUMENT_TYPES } from '../data/seedData'
import { fileSize, formatDate, sortBy } from '../utils/format'

const TYPE_TONES = { PDF: 'red', DOCX: 'blue', XLSX: 'green', PPTX: 'orange', PNG: 'purple', JPG: 'purple', MP4: 'cyan' }

const Documents = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(360)

  const [documents] = useStore(() => getData(KEYS.documents, []))
  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const [search, setSearch] = useState('')
  const [meetingId, setMeetingId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [previewing, setPreviewing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const meetingTitle = (id) => meetings.find((m) => m.id === id)?.title || '—'
  const companyName = (id) => companies.find((c) => c.id === id)?.name || '—'
  const uploaderName = (id) => users.find((u) => u.id === id)?.name || 'Unknown'

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = documents.filter((d) => {
      const matchesQuery = !q || [d.name, meetingTitle(d.meetingId), companyName(d.companyId)].some((v) => String(v).toLowerCase().includes(q))
      return matchesQuery && (!meetingId || d.meetingId === meetingId) && (!companyId || d.companyId === companyId) && (!type || d.type === type)
    })
    return sortBy(filtered, sort.key, sort.dir)
  }, [documents, search, meetingId, companyId, type, sort, meetings, companies])

  const { page, setPage, totalPages, slice, pageSize, count } = usePagination(rows, 8)

  const hasFilters = Boolean(search || meetingId || companyId || type)
  const reset = () => {
    setSearch('')
    setMeetingId('')
    setCompanyId('')
    setType('')
  }

  const download = (doc) => {
    if (!doc.dataUrl) {
      toast('This document is a record only, so there is no file to download.', 'warning')
      return
    }
    const a = document.createElement('a')
    a.href = doc.dataUrl
    a.download = doc.name
    a.click()
    toast('Download started.', 'info')
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <FileText size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.name}</p>
            <p className="text-xs text-muted">{fileSize(row.size)}</p>
          </div>
        </div>
      ),
    },
    { key: 'meeting', header: 'Meeting', render: (row) => meetingTitle(row.meetingId) },
    { key: 'company', header: 'Company', render: (row) => <span className="text-muted">{companyName(row.companyId)}</span> },
    { key: 'type', header: 'Type', sortable: true, render: (row) => <Badge tone={TYPE_TONES[row.type] || 'blue'}>{row.type}</Badge> },
    {
      key: 'uploadedBy',
      header: 'Uploaded by',
      render: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={uploaderName(row.uploadedBy)} size="xs" />
          {uploaderName(row.uploadedBy)}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Created at', sortable: true, render: (row) => <span className="text-muted">{formatDate(String(row.createdAt).slice(0, 10))}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      render: (row) => (
        <Dropdown
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} aria-label={`Actions for ${row.name}`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink">
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <DropdownItem icon={Eye} onClick={() => { close(); setPreviewing(row) }}>
                Preview
              </DropdownItem>
              <DropdownItem icon={Download} onClick={() => { close(); download(row) }}>
                Download
              </DropdownItem>
              <DropdownItem icon={Edit} onClick={() => { close(); setRenaming(row); setRenameValue(row.name) }}>
                Rename
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={Trash2} tone="danger" onClick={() => { close(); setPendingDelete(row) }}>
                Delete
              </DropdownItem>
            </>
          )}
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meeting Documents"
        description="Store and manage all meeting related documents."
        actions={
          <Button icon={Upload} onClick={() => setUploadOpen(true)}>
            Upload document
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search documents…"
          canReset={hasFilters}
          onReset={reset}
          filters={[
            { key: 'meeting', placeholder: 'All meetings', value: meetingId, onChange: setMeetingId, options: meetings.map((m) => ({ value: m.id, label: m.title })) },
            { key: 'company', placeholder: 'All companies', value: companyId, onChange: setCompanyId, options: companies.map((c) => ({ value: c.id, label: c.name })) },
            { key: 'type', placeholder: 'All types', value: type, onChange: setType, options: DOCUMENT_TYPES },
          ]}
        />
        <Table
          columns={columns}
          rows={slice}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={hasFilters ? 'No document matches these filters. Clear them to see everything.' : 'Upload the first document to keep meeting material in one place.'}
              actionLabel={hasFilters ? 'Clear filters' : 'Upload document'}
              onAction={() => (hasFilters ? reset() : setUploadOpen(true))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        meetings={meetings}
        companies={companies}
        onSubmit={(values) => {
          createDocument({ ...values, uploadedBy: user?.id }, user?.name)
          toast('Document uploaded.')
          setUploadOpen(false)
        }}
      />

      <Modal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename document"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!renameValue.trim()) return
                renameDocument(renaming.id, renameValue.trim())
                toast('Document renamed.')
                setRenaming(null)
              }}
            >
              Save name
            </Button>
          </>
        }
      >
        <Input label="Document name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
      </Modal>

      <Modal open={Boolean(previewing)} onClose={() => setPreviewing(null)} title={previewing?.name} size="lg">
        {previewing && isPreviewable(previewing) ? (
          previewing.type === 'MP4' ? (
            <video src={previewing.dataUrl} controls className="w-full rounded-xl" />
          ) : previewing.type === 'PDF' ? (
            <iframe src={previewing.dataUrl} title={previewing.name} className="h-[60vh] w-full rounded-xl border border-line" />
          ) : (
            <img src={previewing.dataUrl} alt={previewing.name} className="mx-auto max-h-[60vh] rounded-xl" />
          )
        ) : (
          <div className="rounded-xl border border-line bg-slate-50/70 px-5 py-10 text-center">
            <FileText size={24} className="mx-auto mb-3 text-muted" aria-hidden="true" />
            <p className="text-[13px] font-medium text-ink">Preview is not available for this document</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Sample records store details only. Upload a PDF, image or video from this browser to preview it here.
            </p>
            <dl className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-y-2 text-left text-xs">
              <dt className="text-muted">Type</dt>
              <dd className="text-ink">{previewing?.type}</dd>
              <dt className="text-muted">Size</dt>
              <dd className="text-ink">{fileSize(previewing?.size)}</dd>
              <dt className="text-muted">Meeting</dt>
              <dd className="truncate text-ink">{meetingTitle(previewing?.meetingId)}</dd>
              <dt className="text-muted">Uploaded by</dt>
              <dd className="text-ink">{uploaderName(previewing?.uploadedBy)}</dd>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="The document record is removed from its meeting and company."
        onConfirm={() => {
          removeDocument(pendingDelete.id)
          toast('Document deleted.')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

export default Documents
