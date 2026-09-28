import { MoreHorizontal, Trash2, Edit, UserCheck, ArrowRightLeft, Inbox } from 'lucide-react'
import Avatar from '../ui/Avatar'
import PriorityBadge from '../ui/PriorityBadge'
import Dropdown, { DropdownDivider, DropdownItem } from '../ui/Dropdown'
import Select from '../ui/Select'
import { ACTION_STATUSES } from '../../data/seedData'
import { cx, relativeDay, todayKey } from '../../utils/format'

const COLUMN_STYLES = {
  'To Do': { header: 'text-brand-700', chip: 'bg-brand-50 text-brand-700', bar: 'bg-brand' },
  'In Progress': { header: 'text-cyan-700', chip: 'bg-cyan-50 text-cyan-700', bar: 'bg-cyan' },
  Blocked: { header: 'text-danger', chip: 'bg-red-50 text-danger', bar: 'bg-danger' },
  Done: { header: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-success' },
}

const ActionCard = ({ item, meeting, company, assignee, onEdit, onDelete, onMove, onAssign, draggable, onDragStart }) => {
  const overdue = item.status !== 'Done' && item.dueDate < todayKey()
  return (
    <article
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, item)}
      className="rounded-xl border border-line bg-white p-3 shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-medium leading-snug text-ink">{item.title}</h3>
        <Dropdown
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} aria-label={`Actions for ${item.title}`} className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink">
              <MoreHorizontal size={15} />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <DropdownItem icon={Edit} onClick={() => { close(); onEdit(item) }}>
                Edit item
              </DropdownItem>
              <DropdownItem icon={UserCheck} onClick={() => { close(); onAssign(item) }}>
                Reassign
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={Trash2} tone="danger" onClick={() => { close(); onDelete(item) }}>
                Delete item
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>

      {item.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={item.priority} />
        <span className={cx('text-xs', overdue ? 'font-medium text-danger' : 'text-muted')}>
          {overdue ? 'Overdue · ' : 'Due '}
          {relativeDay(item.dueDate)}
        </span>
      </div>

      {(meeting || company) && (
        <p className="mt-2 truncate text-xs text-muted">
          {[meeting?.title, company?.name].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={assignee?.name || 'Unassigned'} size="xs" />
          <span className="truncate text-xs text-muted">{assignee?.name || 'Unassigned'}</span>
        </span>
        <Select
          size="sm"
          value={item.status}
          onChange={(e) => onMove(item, e.target.value)}
          options={ACTION_STATUSES}
          aria-label={`Status for ${item.title}`}
          className="h-7 w-[118px] text-xs"
        />
      </div>
    </article>
  )
}

const KanbanBoard = ({ items, meetings, companies, users, onEdit, onDelete, onMove, onAssign, onCreate }) => {
  const byId = (list, id) => list.find((x) => x.id === id)

  const handleDrop = (e, status) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    const item = items.find((i) => i.id === id)
    if (item && item.status !== status) onMove(item, status)
  }

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(272px,1fr)] gap-4 overflow-x-auto pb-2 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4 lg:overflow-visible">
      {ACTION_STATUSES.map((status) => {
        const columnItems = items.filter((i) => i.status === status)
        const style = COLUMN_STYLES[status]
        return (
          <section
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
            className="flex flex-col rounded-xl border border-line bg-slate-50/60"
            aria-label={`${status} column`}
          >
            <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
              <span className={cx('h-2 w-2 rounded-full', style.bar)} aria-hidden="true" />
              <h2 className={cx('text-[13px] font-semibold', style.header)}>{status}</h2>
              <span className={cx('rounded-full px-1.5 text-[11px] font-medium', style.chip)}>{columnItems.length}</span>
            </div>
            <div className="flex-1 space-y-2.5 p-3">
              {columnItems.length === 0 ? (
                <button
                  type="button"
                  onClick={onCreate}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-8 text-center transition-colors hover:border-brand hover:bg-white"
                >
                  <Inbox size={18} className="text-slate-400" aria-hidden="true" />
                  <span className="text-xs text-muted">Nothing here. Add an item.</span>
                </button>
              ) : (
                columnItems.map((item) => (
                  <ActionCard
                    key={item.id}
                    item={item}
                    draggable
                    onDragStart={(e, dragged) => e.dataTransfer.setData('text/plain', dragged.id)}
                    meeting={byId(meetings, item.meetingId)}
                    company={byId(companies, item.companyId)}
                    assignee={byId(users, item.assigneeId)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                    onAssign={onAssign}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default KanbanBoard
