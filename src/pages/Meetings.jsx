import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, Edit, Eye, MoreHorizontal, Plus, Repeat, Trash2, X, XCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import Dropdown, { DropdownDivider, DropdownItem } from '../components/ui/Dropdown'
import Input from '../components/ui/Input'
import RescheduleModal from '../components/meetings/RescheduleModal'
import { KEYS, getData } from '../services/storageService'
import { removeMeeting, rescheduleMeeting, setMeetingStatus } from '../services/meetingsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { MEETING_STATUSES, MEETING_TYPES } from '../data/seedData'
import { addDays, formatTime, relativeDay, sortBy, todayKey } from '../utils/format'
import { meetingCompanyName, userName } from '../utils/meetingHelpers'

const MEETING_TYPE_LABELS = {
  Virtual: 'Virtual Meeting',
  'In Person': 'In-Person Meeting',
  Hybrid: 'Hybrid Meeting',
}

const RANGE_LABELS = { today: "Today's meetings", tomorrow: "Tomorrow's meetings", upcoming: 'Upcoming meetings' }

// Same rules the dashboard counts use, so a card and its list always agree.
const inRange = (m, range) => {
  if (!range) return true
  if (m.status === 'Cancelled') return false
  if (range === 'today') return m.date === todayKey()
  if (range === 'tomorrow') return m.date === addDays(1)
  if (range === 'upcoming') return m.date > addDays(1)
  return true
}

const Meetings = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(360)
  const [params] = useSearchParams()

  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [teams] = useStore(() => getData(KEYS.teams, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const [search, setSearch] = useState('')
  const [meetingType, setMeetingType] = useState('')
  const [range, setRange] = useState(() => (RANGE_LABELS[params.get('range')] ? params.get('range') : ''))
  const [companyId, setCompanyId] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [sort, setSort] = useState({ key: 'date', dir: 'asc' })
  const [selected, setSelected] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)

  const companyName = (m) => meetingCompanyName(m, companies) || '—'
  const personName = (id) => userName(id, users) || '—'

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = meetings.filter((m) => {
      const matchesQuery =
        !q || [m.title, m.ref, companyName(m), MEETING_TYPE_LABELS[m.type] || m.type, personName(m.responsibleId), personName(m.createdBy)].some((v) => String(v).toLowerCase().includes(q))
      return (
        matchesQuery &&
        (!meetingType || m.type === meetingType) &&
        inRange(m, range) &&
        (!companyId || m.companyId === companyId) &&
        (!status || m.status === status) &&
        (!date || m.date === date)
      )
    })
    return sortBy(filtered, sort.key, sort.dir)
  }, [meetings, search, meetingType, range, companyId, status, date, sort, companies, users])

  const { page, setPage, totalPages, slice, pageSize, count } = usePagination(rows, 8)

  const hasFilters = Boolean(search || meetingType || range || companyId || status || date)
  const reset = () => {
    setSearch('')
    setMeetingType('')
    setRange('')
    setCompanyId('')
    setStatus('')
    setDate('')
  }

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.title}</p>
          <p className="text-xs text-muted">{row.ref}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date & time',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-ink">{relativeDay(row.date)}</p>
          <p className="text-xs text-muted">
            {formatTime(row.startTime)}
          </p>
        </div>
      ),
    },
    { key: 'company', header: 'Company', render: (row) => companyName(row) },
    {
      key: 'type',
      header: 'Meeting type',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-muted">{MEETING_TYPE_LABELS[row.type] || row.type || '—'}</p>
          {(row.type === 'In Person' || row.type === 'Hybrid') && row.location && (
            <p className="max-w-[220px] truncate text-xs text-muted" title={row.location}>Location: {row.location}</p>
          )}
          {(row.type === 'Virtual' || row.type === 'Hybrid') && row.meetingLink && (
            <p className="max-w-[220px] truncate text-xs text-muted" title={row.meetingLink}>Link: {row.meetingLink}</p>
          )}
        </div>
      ),
    },
    { key: 'responsible', header: 'Responsible', render: (row) => <span className="text-muted">{personName(row.responsibleId)}</span> },
    { key: 'createdBy', header: 'Created by', render: (row) => <span className="text-muted">{personName(row.createdBy)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
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
              aria-label={`Actions for ${row.title}`}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          {({ close }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownItem icon={Eye} onClick={() => { close(); navigate(`/meetings/${row.id}`) }}>
                View meeting
              </DropdownItem>
              <DropdownItem icon={Edit} onClick={() => { close(); navigate(`/meetings/${row.id}/edit`) }}>
                Edit meeting
              </DropdownItem>
              <DropdownItem icon={Repeat} onClick={() => { close(); setRescheduling(row) }}>
                Reschedule
              </DropdownItem>
              <DropdownItem icon={XCircle} onClick={() => { close(); setPendingCancel(row) }}>
                Cancel meeting
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={Trash2} tone="danger" onClick={() => { close(); setPendingDelete(row) }}>
                Delete meeting
              </DropdownItem>
            </div>
          )}
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meetings"
        description="Manage and track all your meetings."
        actions={
          <Button icon={Plus} onClick={() => navigate('/meetings/create')}>
            Create meeting
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search meetings…"
          canReset={hasFilters}
          onReset={reset}
          filters={[
            { key: 'meetingType', placeholder: 'All types', value: meetingType, onChange: setMeetingType, options: MEETING_TYPES },
            { key: 'company', placeholder: 'All companies', value: companyId, onChange: setCompanyId, options: companies.map((c) => ({ value: c.id, label: c.name })) },
            { key: 'status', placeholder: 'All statuses', value: status, onChange: setStatus, options: MEETING_STATUSES },
          ]}
          trailing={
            <>
              {range && (
                <Button variant="soft" size="sm" icon={X} onClick={() => setRange('')} aria-label={`Clear ${RANGE_LABELS[range]} filter`}>
                  {RANGE_LABELS[range]}
                </Button>
              )}
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" className="h-9 w-[150px]" />
            </>
          }
        />

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-50/60 px-4 py-2.5">
            <p className="text-[13px] font-medium text-brand-700">{selected.length} selected</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selected.forEach((id) => setMeetingStatus(id, 'Completed', user?.name))
                toast(`${selected.length} meeting${selected.length === 1 ? '' : 's'} marked completed.`)
                setSelected([])
              }}
            >
              Mark completed
            </Button>
            <Button
              size="sm"
              variant="dangerSoft"
              onClick={() => {
                selected.forEach((id) => removeMeeting(id))
                toast('Meetings deleted successfully.')
                setSelected([])
              }}
            >
              Delete
            </Button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs text-muted hover:text-ink">
              Clear selection
            </button>
          </div>
        )}

        <Table
          columns={columns}
          rows={slice}
          loading={loading}
          selectable
          selected={selected}
          onSelectChange={setSelected}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(row) => navigate(`/meetings/${row.id}`)}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title="No meetings found"
              description={hasFilters ? 'No meeting matches these filters. Clear them to see everything.' : 'Create your first meeting to get started.'}
              actionLabel={hasFilters ? 'Clear filters' : 'Create meeting'}
              actionIcon={hasFilters ? undefined : Plus}
              onAction={() => (hasFilters ? reset() : navigate('/meetings/create'))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <RescheduleModal
        open={Boolean(rescheduling)}
        meeting={rescheduling}
        onClose={() => setRescheduling(null)}
        onSubmit={(values) => {
          rescheduleMeeting(rescheduling.id, values, user?.name)
          toast('Meeting rescheduled successfully.')
          setRescheduling(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        onClose={() => setPendingCancel(null)}
        title={`Cancel ${pendingCancel?.title}?`}
        description="The meeting stays in the list with a Cancelled status so participants can see what happened."
        confirmLabel="Cancel meeting"
        tone="danger"
        onConfirm={() => {
          setMeetingStatus(pendingCancel.id, 'Cancelled', user?.name)
          toast('Meeting cancelled.')
          setPendingCancel(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.title}?`}
        description="This removes the meeting and its documents. Action items stay in the workspace without a meeting link."
        onConfirm={() => {
          removeMeeting(pendingDelete.id)
          toast('Meeting deleted successfully.')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

export default Meetings
