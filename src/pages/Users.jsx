import { useMemo, useState } from 'react'
import { Edit, MoreHorizontal, Send, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react'
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
import UserFormModal from '../components/users/UserFormModal'
import { KEYS, getData } from '../services/storageService'
import { createUser, removeUser, updateUser } from '../services/usersService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { AUTH_METHODS, LEGACY_ROLES, ROLES, USER_STATUSES } from '../data/seedData'
import { sortBy, timeAgo } from '../utils/format'

const ROLE_TONES = {
  Admin: 'purple', Manager: 'blue', 'Group Manager': 'purple', Editor: 'cyan', 'Manual Add': 'neutral',
  'Team Member': 'cyan', Viewer: 'neutral',
}

const UsersPage = () => {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const loading = useLoading(340)

  const [users] = useStore(() => getData(KEYS.users, []))
  const [teams] = useStore(() => getData(KEYS.teams, []))

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [authMethod, setAuthMethod] = useState('')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = users.filter((u) => {
      const matchesQuery = !q || [u.name, u.email, u.title].some((v) => String(v || '').toLowerCase().includes(q))
      return matchesQuery && (!role || u.role === role) && (!status || u.status === status) && (!authMethod || u.authMethod === authMethod)
    })
    return sortBy(filtered, sort.key, sort.dir)
  }, [users, search, role, status, authMethod, sort])

  const { page, setPage, totalPages, slice, pageSize, count } = usePagination(rows, 8)
  const hasFilters = Boolean(search || role || status || authMethod)
  const reset = () => {
    setSearch('')
    setRole('')
    setStatus('')
    setAuthMethod('')
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.name}</p>
            <p className="truncate text-xs text-muted">{row.title || teams.find((t) => t.id === row.teamId)?.name || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, className: 'text-muted' },
    { key: 'role', header: 'Role', sortable: true, render: (row) => <Badge tone={ROLE_TONES[row.role]}>{row.role}</Badge> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} kind="generic" /> },
    { key: 'authMethod', header: 'Auth method', render: (row) => <span className="text-muted">{row.authMethod}</span> },
    { key: 'lastSeen', header: 'Last seen', sortable: true, render: (row) => <span className="text-muted">{row.lastSeen ? timeAgo(row.lastSeen) : 'Never'}</span> },
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
              <DropdownItem icon={Edit} onClick={() => { close(); setEditing(row); setFormOpen(true) }}>
                Edit user
              </DropdownItem>
              {row.status !== 'Activated' && (
                <DropdownItem
                  icon={Send}
                  onClick={() => {
                    close()
                    updateUser(row.id, { status: 'Invited' })
                    toast(`Invitation sent to ${row.email}.`)
                  }}
                >
                  Send invitation
                </DropdownItem>
              )}
              <DropdownDivider />
              <DropdownItem
                icon={Trash2}
                tone="danger"
                disabled={row.id === currentUser?.id}
                onClick={() => {
                  close()
                  if (row.id === currentUser?.id) {
                    toast('You cannot delete the account you are signed in with.', 'warning')
                    return
                  }
                  setPendingDelete(row)
                }}
              >
                Delete user
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
        title="Users"
        description="Manage your application users and their access."
        actions={
          <Button icon={UserPlus} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Add user
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search users…"
          canReset={hasFilters}
          onReset={reset}
          filters={[
            { key: 'role', placeholder: 'All roles', value: role, onChange: setRole, options: [...ROLES, ...LEGACY_ROLES.filter((r) => users.some((u) => u.role === r))] },
            { key: 'status', placeholder: 'All statuses', value: status, onChange: setStatus, options: USER_STATUSES },
            { key: 'auth', placeholder: 'All auth methods', value: authMethod, onChange: setAuthMethod, options: AUTH_METHODS },
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
              icon={UsersIcon}
              title="No users found"
              description={hasFilters ? 'No user matches these filters.' : 'Invite your first teammate to the workspace.'}
              actionLabel={hasFilters ? 'Clear filters' : 'Add user'}
              onAction={() => (hasFilters ? reset() : setFormOpen(true))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <UserFormModal
        open={formOpen}
        user={editing}
        teams={teams}
        existingEmails={users.map((u) => u.email.toLowerCase())}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={(values) => {
          if (editing) {
            updateUser(editing.id, values)
            toast('User updated successfully.')
          } else {
            createUser(values)
            toast('User added.')
          }
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="The account loses access immediately. Meetings and action items they created stay in the workspace."
        onConfirm={() => {
          removeUser(pendingDelete.id)
          toast('User deleted.')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

export default UsersPage
