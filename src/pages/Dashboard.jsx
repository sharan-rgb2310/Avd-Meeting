import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CalendarDays, Clock, Plus } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Button from '../components/ui/Button'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import StatCard from '../components/dashboard/StatCard'
import RecentMeetings from '../components/dashboard/RecentMeetings'
import RecentActionItems from '../components/dashboard/RecentActionItems'
import { ActionCompletionChart, MeetingActivityChart, MeetingsByStatusChart } from '../components/dashboard/DashboardCharts'
import { KEYS, getData } from '../services/storageService'
import {
  getActionItemCompletion, getMeetingActivity, getMeetingScheduleStats, getMeetingsByStatus,
} from '../services/dashboardService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useAuth } from '../context/AuthContext'
import { formatShortDate, sortBy } from '../utils/format'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const loading = useLoading(380)

  const [schedule] = useStore(getMeetingScheduleStats)
  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [actionItems] = useStore(() => getData(KEYS.actionItems, []))
  const [users] = useStore(() => getData(KEYS.users, []))
  const [byStatus] = useStore(getMeetingsByStatus)
  const [completion] = useStore(getActionItemCompletion)
  const [activity] = useStore(getMeetingActivity)

  const recentMeetings = useMemo(() => sortBy(meetings, 'updatedAt', 'desc').slice(0, 4), [meetings])
  const openItems = useMemo(
    () => sortBy(actionItems.filter((a) => a.status !== 'Done'), 'dueDate', 'asc').slice(0, 4),
    [actionItems]
  )

  const cards = [
    {
      label: "Today's meetings",
      value: schedule.todayCount,
      icon: Clock,
      highlight: 'blue',
      comparison: formatShortDate(schedule.today),
      to: '/meetings?range=today',
    },
    {
      label: "Tomorrow's meetings",
      value: schedule.tomorrowCount,
      icon: Calendar,
      highlight: 'green',
      comparison: formatShortDate(schedule.tomorrow),
      to: '/meetings?range=tomorrow',
    },
    {
      label: 'Upcoming meetings',
      value: schedule.upcomingCount,
      icon: CalendarDays,
      highlight: 'orange',
      to: '/meetings?range=upcoming',
    },
  ]

  const firstName = (user?.name || 'there').split(' ')[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description="Here's what's happening with your meetings and activities today."
        actions={
          <Button icon={Plus} onClick={() => navigate('/meetings/create')}>
            Create meeting
          </Button>
        }
      />

      {loading ? (
        <>
          <LoadingSkeleton variant="stats" cards={3} />
          <LoadingSkeleton rows={4} />
        </>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Meeting schedule summary">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} onClick={() => navigate(c.to)} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <RecentMeetings meetings={recentMeetings} companies={companies} />
            <RecentActionItems items={openItems} users={users} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <MeetingsByStatusChart data={byStatus} />
            <MeetingActivityChart data={activity} />
            <ActionCompletionChart data={completion} />
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard
