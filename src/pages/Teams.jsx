import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Eye, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import AvatarGroup from '../components/ui/AvatarGroup'
import Pagination from '../components/ui/Pagination'
import Dropdown, { DropdownDivider, DropdownItem } from '../components/ui/Dropdown'
import TeamFormModal from '../components/teams/TeamFormModal'
import { KEYS, getData } from '../services/storageService'
import { createTeam, removeTeam, updateTeam } from '../services/teamsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { DEPARTMENTS } from '../data/seedData'
import { sortBy } from '../utils/format'

const Teams = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const loading = useLoading(340)

  const [teams] = useStore(() => getData(KEYS.teams, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const userName = (id) => users.find((u) => u.id === id)?.name || 'Unassigned'

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = teams.filter((t) => {
      const matchesQuery = !q || [t.name, t.department, userName(t.leadId)].some((v) => String(v).toLowerCase().includes(q))
      return matchesQuery && (!department || t.department === department) && (!status || t.status === status)
    })
    return sortBy(filtered, sort.key, sort.dir)
  }, [teams, search, department, status, sort, users])

  const { page, setPage, totalPages, slice, pageSize, count } = usePagination(rows, 8)
  const hasFilters = Boolean(search || department || status)
  const reset = () => {
    setSearch('')
    setDepartment('')
    setStatus('')
  }

  const columns = [
    { key: 'name', header: 'Team name', sortable: true, render: (row) => <span className="font-medium text-ink">{row.name}</span> },
    { key: 'department', header: 'Department', sortable: true, render: (row) => <Badge tone="purple">{row.department}</Badge> },
    { key: 'lead', header: 'Team lead', render: (row) => userName(row.leadId) },
    {
      key: 'members',
      header: 'Members',
      render: (row) => (
        <span className="flex items-center gap-2">
          <AvatarGroup names={(row.memberIds || []).map(userName)} max={3} />
          <span className="text-muted">{(row.memberIds || []).length}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} kind="generic" /> },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      render: (row) => (
        <Dropdown
          trigger={({ toggle }) => (
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle() }} aria-label={`Actions for ${row.name}`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink">
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          {({ close }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownItem icon={Eye} onClick={() => { close(); navigate(`/teams/${row.id}`) }}>
                View team
              </DropdownItem>
              <DropdownItem icon={Edit} onClick={() => { close(); setEditing(row); setFormOpen(true) }}>
                Edit team
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={Trash2} tone="danger" onClick={() => { close(); setPendingDelete(row) }}>
                Delete team
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
        title="Teams"
        description="Manage your teams and their members."
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Create team
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search teams…"
          canReset={hasFilters}
          onReset={reset}
          filters={[
            { key: 'department', placeholder: 'All departments', value: department, onChange: setDepartment, options: DEPARTMENTS },
            { key: 'status', placeholder: 'All statuses', value: status, onChange: setStatus, options: ['Active', 'Inactive'] },
          ]}
        />
        <Table
          columns={columns}
          rows={slice}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(row) => navigate(`/teams/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Users}
              title="No teams found"
              description={hasFilters ? 'No team matches these filters.' : 'Create a team so meetings and action items roll up to a group.'}
              actionLabel={hasFilters ? 'Clear filters' : 'Create team'}
              onAction={() => (hasFilters ? reset() : setFormOpen(true))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <TeamFormModal
        open={formOpen}
        team={editing}
        users={users}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={(values) => {
          if (editing) {
            updateTeam(editing.id, values)
            toast('Team updated successfully.')
          } else {
            createTeam(values)
            toast('Team created.')
          }
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="Members keep their accounts. Meetings assigned to this team lose their team link."
        onConfirm={() => {
          removeTeam(pendingDelete.id)
          toast('Team deleted.')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

export default Teams 
