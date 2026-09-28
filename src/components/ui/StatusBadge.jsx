import Badge from './Badge'

const MEETING_TONES = {
  Scheduled: 'blue',
  'In Progress': 'cyan',
  Completed: 'green',
  Rescheduled: 'orange',
  Cancelled: 'red',
  'On Hold': 'purple',
}

const GENERIC_TONES = {
  Active: 'green',
  Activated: 'green',
  Customer: 'blue',
  Prospect: 'purple',
  Inactive: 'neutral',
  Invited: 'orange',
  'Not Invited': 'neutral',
  'To Do': 'blue',
  'In Progress': 'cyan',
  Blocked: 'red',
  Done: 'green',
}

const StatusBadge = ({ status, kind = 'meeting', className }) => {
  const tone = (kind === 'meeting' ? MEETING_TONES[status] : GENERIC_TONES[status]) || 'neutral'
  return (
    <Badge tone={tone} dot className={className}>
      {status || 'Unknown'}
    </Badge>
  )
}

export default StatusBadge
