import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Edit, Eye, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import Avatar from '../components/ui/Avatar'
import Pagination from '../components/ui/Pagination'
import Dropdown, { DropdownDivider, DropdownItem } from '../components/ui/Dropdown'
import CompanyFormModal from '../components/companies/CompanyFormModal'
import { KEYS, getData } from '../services/storageService'
import { createCompany, removeCompany, updateCompany } from '../services/companiesService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { COMPANY_STATUSES, INDUSTRIES } from '../data/seedData'
import { sortBy } from '../utils/format'

const Companies = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const loading = useLoading(360)

  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [actionItems] = useStore(() => getData(KEYS.actionItems, []))

  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('')
  const [sortValue, setSortValue] = useState('name-asc')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = companies.filter((c) => {
      const matchesQuery =
        !q ||
        [c.name, c.contactName, c.email, c.location].some((v) => String(v || '').toLowerCase().includes(q))
      return matchesQuery && (!industry || c.industry === industry) && (!status || c.status === status)
    })
    return sortBy(filtered, sort.key, sort.dir)
  }, [companies, search, industry, status, sort])

  const { page, setPage, totalPages, slice, pageSize, count } = usePagination(rows, 8)

  const meetingCount = (id) => meetings.filter((m) => m.companyId === id).length
  const openActions = (id) => actionItems.filter((a) => a.companyId === id && a.status !== 'Done').length

  const save = (values) => {
    if (editing) {
      updateCompany(editing.id, values)
      toast('Company updated successfully.')
    } else {
      createCompany(values)
      toast('Company created successfully.')
    }
    setFormOpen(false)
    setEditing(null)
  }

  const confirmDelete = () => {
    removeCompany(pendingDelete.id)
    toast('Company deleted successfully.')
    setPendingDelete(null)
  }

  const columns = [
    {
      key: 'name',
      header: 'Company',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.name}</p>
            <p className="truncate text-xs text-muted">{row.location || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', sortable: true, render: (row) => <Badge tone="purple">{row.industry}</Badge> },
    { key: 'contactName', header: 'Primary contact', sortable: true },
    { key: 'email', header: 'Email', className: 'text-muted' },
    { key: 'phone', header: 'Phone', className: 'text-muted' },
    { key: 'meetings', header: 'Meetings', render: (row) => meetingCount(row.id) },
    {
      key: 'actions_open',
      header: 'Open actions',
      render: (row) => {
        const n = openActions(row.id)
        return n ? <Badge tone={n > 2 ? 'orange' : 'blue'}>{n}</Badge> : <span className="text-muted">0</span>
      },
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} kind="generic" /> },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      render: (row) => (
        <Dropdown
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggle()
              }}
              aria-label={`Actions for ${row.name}`}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          {({ close }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownItem icon={Eye} onClick={() => { close(); navigate(`/companies/${row.id}`) }}>
                View details
              </DropdownItem>
              <DropdownItem icon={Edit} onClick={() => { close(); setEditing(row); setFormOpen(true) }}>
                Edit company
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={Trash2} tone="danger" onClick={() => { close(); setPendingDelete(row) }}>
                Delete company
              </DropdownItem>
            </div>
          )}
        </Dropdown>
      ),
    },
  ]

  const resetFilters = () => {
    setSearch('')
    setIndustry('')
    setStatus('')
    setSortValue('name-asc')
    setSort({ key: 'name', dir: 'asc' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Companies"
        description="Manage companies and customer organizations."
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Create company
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search companies…"
          canReset={Boolean(search || industry || status)}
          onReset={resetFilters}
          filters={[
            { key: 'industry', placeholder: 'All industries', options: INDUSTRIES, value: industry, onChange: setIndustry },
            { key: 'status', placeholder: 'All statuses', options: COMPANY_STATUSES, value: status, onChange: setStatus },
            {
              key: 'sort',
              placeholder: 'Sort by',
              value: sortValue,
              onChange: (v) => {
                setSortValue(v)
                const [key, dir] = v.split('-')
                setSort({ key, dir })
              },
              options: [
                { value: 'name-asc', label: 'Name A–Z' },
                { value: 'name-desc', label: 'Name Z–A' },
                { value: 'status-asc', label: 'Status' },
                { value: 'createdAt-desc', label: 'Newest first' },
              ],
            },
          ]}
        />
        <Table
          columns={columns}
          rows={slice}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(row) => navigate(`/companies/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No companies found"
              description={search || industry || status ? 'No company matches these filters. Clear them to see everything.' : 'Add your first company to start tracking meetings against an account.'}
              actionLabel={search || industry || status ? 'Clear filters' : 'Create company'}
              actionIcon={search || industry || status ? undefined : Plus}
              onAction={() => (search || industry || status ? resetFilters() : setFormOpen(true))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <CompanyFormModal open={formOpen} company={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSubmit={save} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete ${pendingDelete?.name}?`}
        description="Meetings and action items stay in the workspace, but they will no longer be linked to this company."
      />
    </div>
  )
}

export default Companies
