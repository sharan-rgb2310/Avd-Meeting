import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, Edit, MoreHorizontal, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react'
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
import {
  createUser,
  removeManagedUser,
  removeUser,
  setUserBlocked,
  updateManagedUser,
  updateUser,
} from '../services/usersService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import usePagination from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { AUTH_METHODS, LEGACY_ROLES, ROLES, USER_STATUSES } from '../data/seedData'
import { supabase } from '../utils/supabase'
import { sortBy, timeAgo } from '../utils/format'

const ROLE_TONES = {
  Admin: 'purple', Manager: 'blue', 'Group Manager': 'purple', Editor: 'cyan', 'Manual Add': 'neutral',
  'Team Member': 'cyan', Viewer: 'neutral', Unassigned: 'neutral',
}

const UsersPage = () => {
  const { toast } = useToast()
  const { user: currentUser, logout } = useAuth()
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
  const [deleting, setDeleting] = useState(false)
  const [pendingAdminAction, setPendingAdminAction] = useState(null)
  const [managingAccount, setManagingAccount] = useState(false)
  const isAdmin = Boolean(supabase && currentUser?.role === 'Admin')

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
    { key: 'role', header: 'Role', sortable: true, render: (row) => <Badge tone={ROLE_TONES[row.role] || ROLE_TONES.Unassigned}>{row.role || 'Unassigned'}</Badge> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} kind="generic" /> },
    { key: 'authMethod', header: 'Auth method', render: (row) => <span className="text-muted">{row.authMethod}</span> },
    { key: 'lastSeen', header: 'Last seen', sortable: true, render: (row) => <span className="text-muted">{row.lastSeen ? timeAgo(row.lastSeen) : row.isAuthAccount ? '—' : 'Never'}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-10 text-right',
      render: (row) => {
        const ownAccount = row.id === currentUser?.id
        const canManageAccount = isAdmin && row.isAuthAccount && !ownAccount
        const canBlockAccount = canManageAccount
        const canEditAccount = !supabase || ownAccount || (isAdmin && row.isAuthAccount)
        const canDeleteAccount = !supabase || ownAccount || (isAdmin && row.isAuthAccount)
        return (
          <Dropdown
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} aria-label={`Actions for ${row.name}`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink">
                <MoreHorizontal size={16} />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <DropdownItem
                  icon={Edit}
                  disabled={!canEditAccount}
                  title={canEditAccount ? undefined : 'Only the workspace Admin can edit another account.'}
                  onClick={() => { close(); setEditing(row); setFormOpen(true) }}
                >
                  {ownAccount ? 'Edit my account' : 'Edit'}
                </DropdownItem>
                {canBlockAccount && (
                  <>
                    <DropdownDivider />
                    <DropdownItem
                      icon={row.status === 'Inactive' ? CheckCircle2 : Ban}
                      onClick={() => {
                        close()
                        setPendingAdminAction({ user: row, action: row.status === 'Inactive' ? 'unblock' : 'block' })
                      }}
                    >
                      {row.status === 'Inactive' ? 'Unblock account' : 'Block account'}
                    </DropdownItem>
                  </>
                )}
                <DropdownDivider />
                <DropdownItem
                  icon={Trash2}
                  tone="danger"
                  disabled={!canDeleteAccount}
                  title={canDeleteAccount ? undefined : 'Only the workspace Admin can delete another account.'}
                  onClick={() => {
                    close()
                    if (ownAccount || !supabase) setPendingDelete(row)
                    else setPendingAdminAction({ user: row, action: 'delete' })
                  }}
                >
                  {ownAccount ? 'Delete my account' : 'Delete'}
                </DropdownItem>
              </>
            )}
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description={isAdmin
          ? 'Everyone can view the shared directory. Administrators can manage accounts, assign roles, and block or unblock users.'
          : 'Everyone can view the shared directory. You can edit or delete only your own account.'}
        actions={
          (!supabase || isAdmin) ? (
            <Button icon={UserPlus} onClick={() => { setEditing(null); setFormOpen(true) }}>
              Add user
            </Button>
          ) : null
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
            { key: 'role', placeholder: 'All roles', value: role, onChange: setRole, options: [...new Set([...ROLES, ...LEGACY_ROLES.filter((r) => users.some((u) => u.role === r)), ...users.map((u) => u.role).filter(Boolean)])] },
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
              description={hasFilters
                ? 'No user matches these filters.'
                : isAdmin || !supabase
                  ? 'Invite your first teammate to the workspace.'
                  : 'No workspace users are available yet.'}
              actionLabel={hasFilters ? 'Clear filters' : isAdmin || !supabase ? 'Add user' : undefined}
              onAction={() => (hasFilters ? reset() : (isAdmin || !supabase) && setFormOpen(true))}
            />
          }
        />
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} pageSize={pageSize} />}
      </Card>

      <UserFormModal
        open={formOpen}
        user={editing}
        selfEdit={Boolean(editing && editing.id === currentUser?.id)}
        cloudMode={Boolean(supabase)}
        canAssignAdmin={isAdmin}
        teams={teams}
        existingEmails={users.map((u) => String(u.email || '').toLowerCase())}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={async (values) => {
          try {
            if (editing) {
              const selfEdit = editing.id === currentUser?.id
              if (selfEdit) await updateUser(editing.id, values)
              else await updateManagedUser(editing.id, values)
              toast(selfEdit ? 'Your account was updated.' : 'User account updated.')
            } else {
              await createUser(values)
              toast(supabase ? `Invitation sent to ${values.email}.` : 'Local directory entry added.')
            }
            setFormOpen(false)
            setEditing(null)
          } catch (error) {
            toast(error.message || 'The account could not be saved.', 'warning')
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        title={pendingDelete?.id === currentUser?.id ? 'Delete your account?' : `Delete ${pendingDelete?.name}?`}
        description={pendingDelete?.id === currentUser?.id
          ? supabase
            ? 'This permanently deletes your Supabase account and your personal workspace records. Other users’ accounts and records are not deleted. This cannot be undone.'
            : 'This removes your local account from this browser. This cannot be undone.'
          : 'This removes the local directory entry from this browser. This cannot be undone.'}
        confirmLabel={pendingDelete?.id === currentUser?.id ? 'Delete my account' : 'Delete user'}
        loading={deleting}
        onConfirm={async () => {
          if (!pendingDelete) return
          setDeleting(true)
          try {
            const isOwnAccount = pendingDelete.id === currentUser?.id
            const result = isOwnAccount
              ? await removeUser(pendingDelete.id)
              : await removeManagedUser(pendingDelete.id)
            if (isOwnAccount && !supabase) await logout()
            toast(result?.warning || (isOwnAccount ? 'Your account was deleted.' : 'User deleted.'))
            setPendingDelete(null)
          } catch (error) {
            toast(error.message || 'The account could not be deleted.', 'warning')
          } finally {
            setDeleting(false)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingAdminAction)}
        onClose={() => !managingAccount && setPendingAdminAction(null)}
        title={
          pendingAdminAction?.action === 'delete'
            ? `Permanently delete ${pendingAdminAction?.user.name}?`
            : pendingAdminAction?.action === 'block'
              ? `Block ${pendingAdminAction?.user.name}?`
              : `Unblock ${pendingAdminAction?.user.name}?`
        }
        description={
          pendingAdminAction?.action === 'delete'
            ? 'This permanently removes the Auth account and its private workspace records. It cannot be undone.'
            : pendingAdminAction?.action === 'block'
              ? 'This prevents sign-in and blocks access to protected workspace data. The account and its data are preserved, and you can unblock it later.'
              : 'This restores the user’s ability to sign in and access protected workspace data.'
        }
        confirmLabel={
          pendingAdminAction?.action === 'delete'
            ? 'Permanently delete'
            : pendingAdminAction?.action === 'block'
              ? 'Block account'
              : 'Unblock account'
        }
        loading={managingAccount}
        onConfirm={async () => {
          if (!pendingAdminAction) return
          setManagingAccount(true)
          try {
            if (pendingAdminAction.action === 'delete') {
              await removeManagedUser(pendingAdminAction.user.id)
              toast('User account permanently deleted.')
            } else {
              const blocked = pendingAdminAction.action === 'block'
              await setUserBlocked(pendingAdminAction.user.id, blocked)
              toast(blocked ? 'User account blocked.' : 'User account unblocked.')
            }
            setPendingAdminAction(null)
          } catch (error) {
            toast(error.message || 'The user account could not be updated.', 'warning')
          } finally {
            setManagingAccount(false)
          }
        }}
      />
    </div>
  )
}

export default UsersPage
