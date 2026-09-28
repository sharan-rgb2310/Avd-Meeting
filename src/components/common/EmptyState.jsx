import { Inbox } from 'lucide-react'
import Button from '../ui/Button'

const EmptyState = ({ icon: Icon = Inbox, title, description, actionLabel, onAction, actionIcon, compact = false }) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-16'}`}>
    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
      <Icon size={22} aria-hidden="true" />
    </span>
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
    {actionLabel && onAction && (
      <Button className="mt-4" icon={actionIcon} onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
)

export default EmptyState
