import { useNavigate } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import PriorityBadge from '../ui/PriorityBadge'
import Avatar from '../ui/Avatar'
import EmptyState from '../common/EmptyState'
import { relativeDay } from '../../utils/format'

const RecentActionItems = ({ items, users }) => {
  const navigate = useNavigate()
  const assignee = (id) => users.find((u) => u.id === id)?.name || 'Unassigned'

  return (
    <Card>
      <CardHeader
        title="Recent action items"
        description="Follow-ups that still need an owner's attention"
        action={
          <button type="button" onClick={() => navigate('/action-items')} className="text-[13px] font-medium text-brand hover:text-brand-700">
            View all
          </button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={CheckSquare}
          title="Nothing outstanding"
          description="Every action item is done. Create a new one from any meeting."
          actionLabel="Open action items"
          onAction={() => navigate('/action-items')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate('/action-items')}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <Avatar name={assignee(item.assigneeId)} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="block truncate text-xs text-muted">{assignee(item.assigneeId)}</span>
                </span>
                <span className="hidden whitespace-nowrap text-xs text-muted sm:block">{relativeDay(item.dueDate)}</span>
                <PriorityBadge priority={item.priority} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default RecentActionItems
