import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import KanbanBoard from '../components/actionItems/KanbanBoard'
import ActionItemFormModal from '../components/meetings/ActionItemFormModal'
import { KEYS, getData } from '../services/storageService'
import { createActionItem, moveActionItem, removeActionItem, updateActionItem } from '../services/actionItemsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { PRIORITIES } from '../data/seedData'

const ActionItems = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(380)

  const [items] = useStore(() => getData(KEYS.actionItems, []))
  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const [search, setSearch] = useState('')
  const [meetingId, setMeetingId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [assignTo, setAssignTo] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      const matchesQuery = !q || [i.title, i.description].some((v) => String(v || '').toLowerCase().includes(q))
      return (
        matchesQuery &&
        (!meetingId || i.meetingId === meetingId) &&
        (!assigneeId || i.assigneeId === assigneeId) &&
        (!priority || i.priority === priority)
      )
    })
  }, [items, search, meetingId, assigneeId, priority])

  const hasFilters = Boolean(search || meetingId || assigneeId || priority)
  const reset = () => {
    setSearch('')
    setMeetingId('')
    setAssigneeId('')
    setPriority('')
  }

  const save = (values) => {
    if (editing) {
      updateActionItem(editing.id, values, user?.name)
      toast('Action item updated.')
    } else {
      createActionItem(values, user?.name)
      toast('Action item created.')
    }
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Action Items"
        description="Track and manage action items from your meetings."
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Create action item
          </Button>
        }
      />

      <Card>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search action items…"
          canReset={hasFilters}
          onReset={reset}
          filters={[
            { key: 'meeting', placeholder: 'All meetings', value: meetingId, onChange: setMeetingId, options: meetings.map((m) => ({ value: m.id, label: m.title })) },
            { key: 'assignee', placeholder: 'All assignees', value: assigneeId, onChange: setAssigneeId, options: users.map((u) => ({ value: u.id, label: u.name })) },
            { key: 'priority', placeholder: 'All priorities', value: priority, onChange: setPriority, options: PRIORITIES },
          ]}
        />
        <p className="px-4 py-2.5 text-xs text-muted">
          Drag a card between columns, or change its status from the card. {filtered.length} of {items.length} items shown.
        </p>
      </Card>

      {loading ? (
        <LoadingSkeleton variant="kanban" />
      ) : (
        <KanbanBoard
          items={filtered}
          meetings={meetings}
          companies={companies}
          users={users}
          onCreate={() => { setEditing(null); setFormOpen(true) }}
          onEdit={(item) => { setEditing(item); setFormOpen(true) }}
          onDelete={(item) => setPendingDelete(item)}
          onAssign={(item) => { setAssigning(item); setAssignTo(item.assigneeId) }}
          onMove={(item, status) => {
            moveActionItem(item.id, status, user?.name)
            toast(`Moved to ${status}.`, 'info')
          }}
        />
      )}

      <ActionItemFormModal
        open={formOpen}
        item={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={save}
        meetings={meetings}
        companies={companies}
        users={users}
      />

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="Reassign action item"
        description={assigning?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateActionItem(assigning.id, { assigneeId: assignTo }, user?.name)
                toast('Action item reassigned.')
                setAssigning(null)
              }}
            >
              Reassign
            </Button>
          </>
        }
      >
        <Select
          label="Assignee"
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          placeholder="Select a person"
          options={users.map((u) => ({ value: u.id, label: `${u.name} · ${u.role}` }))}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.title}?`}
        description="The item is removed from the board and from its meeting."
        onConfirm={() => {
          removeActionItem(pendingDelete.id)
          toast('Action item deleted.')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

export default ActionItems
