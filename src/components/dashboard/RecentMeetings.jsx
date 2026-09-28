import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import Avatar from '../ui/Avatar'
import EmptyState from '../common/EmptyState'
import { formatTime, relativeDay } from '../../utils/format'
import { meetingCompanyName } from '../../utils/meetingHelpers'

const RecentMeetings = ({ meetings, companies }) => {
  const navigate = useNavigate()
  const companyName = (m) => meetingCompanyName(m, companies) || 'No company'

  return (
    <Card>
      <CardHeader
        title="Recent meetings"
        description="Your most recently updated meetings"
        action={
          <button type="button" onClick={() => navigate('/meetings')} className="text-[13px] font-medium text-brand hover:text-brand-700">
            View all
          </button>
        }
      />
      {meetings.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDays}
          title="No meetings yet"
          description="Create your first meeting to see it here."
          actionLabel="Create meeting"
          onAction={() => navigate('/meetings/create')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {meetings.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => navigate(`/meetings/${m.id}`)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <Avatar name={m.title} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{m.title}</span>
                  <span className="block truncate text-xs text-muted">{companyName(m)}</span>
                </span>
                <span className="hidden whitespace-nowrap text-xs text-muted sm:block">
                  {relativeDay(m.date)}, {formatTime(m.startTime)}
                </span>
                <StatusBadge status={m.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default RecentMeetings
