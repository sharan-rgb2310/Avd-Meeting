import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import Card, { CardHeader } from '../ui/Card'

const STATUS_COLORS = {
  Scheduled: '#2563EB',
  'In Progress': '#06B6D4',
  Completed: '#10B981',
  Rescheduled: '#F59E0B',
  Cancelled: '#EF4444',
  'On Hold': '#7C3AED',
}

const ACTION_COLORS = {
  'To Do': '#2563EB',
  'In Progress': '#06B6D4',
  Blocked: '#EF4444',
  Done: '#10B981',
}

const axisProps = {
  tick: { fill: '#64748B', fontSize: 11 },
  axisLine: { stroke: '#E2E8F0' },
  tickLine: false,
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    boxShadow: '0 10px 30px -10px rgba(11,23,54,.25)',
    fontSize: 12,
  },
}

export const MeetingsByStatusChart = ({ data }) => (
  <Card>
    <CardHeader title="Meetings by status" description="Across the whole workspace" />
    <div className="h-[240px] px-3 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="status" {...axisProps} interval={0} angle={-12} textAnchor="end" height={48} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#EFF6FF' }} />
          <Bar dataKey="value" name="Meetings" radius={[6, 6, 0, 0]} maxBarSize={38}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#2563EB'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>
)

export const MeetingActivityChart = ({ data }) => (
  <Card>
    <CardHeader title="Meeting activity" description="Scheduled and completed over six months" />
    <div className="h-[240px] px-3 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="meetings" name="Scheduled" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="completed" name="Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </Card>
)

export const ActionCompletionChart = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <Card>
      <CardHeader title="Action item completion" description={`${total} items tracked`} />
      <div className="space-y-3.5 px-5 py-5">
        {data.map((d) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0
          return (
            <div key={d.status}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-ink">{d.status}</span>
                <span className="text-muted">
                  {d.value} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: ACTION_COLORS[d.status] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
