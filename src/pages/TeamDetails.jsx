import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarDays, CheckSquare, Edit, Trash2, UserCog, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import PriorityBadge from '../components/ui/PriorityBadge'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import TeamFormModal from '../components/teams/TeamFormModal'
import { KEYS, getData } from '../services/storageService'
import { removeTeam, updateTeam } from '../services/teamsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { formatDate, formatTime, relativeDay } from '../utils/format'

const TeamDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const loading = useLoading(320)

  const [team] = useStore(() => getData(KEYS.teams, []).find((t) => t.id === id) || null, [id])
  const [users] = useStore(() => getData(KEYS.users, []))
  const [meetings] = useStore(() => getData(KEYS.meetings, []).filter((m) => m.teamId === id), [id])
  const [companies] = useStore(() => getData(KEYS.companies, []))

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (loading) return <LoadingSkeleton rows={6} />
  if (!team) {
    return <ErrorState title="Team not found" description="This team may have been deleted." onRetry={() => navigate('/teams')} />
  }

  const members = users.filter((u) => (team.memberIds || []).includes(u.id))
  const lead = users.find((u) => u.id === team.leadId)
  const meetingIds = meetings.map((m) => m.id)
  const actionItems = getData(KEYS.actionItems, []).filter(
    (a) => meetingIds.includes(a.meetingId) || (team.memberIds || []).includes(a.assigneeId)
  )
  const companyName = (cid) => companies.find((c) => c.id === cid)?.name || '—'

  return (
    <div className="space-y-5">
      <PageHeader
        back
        title={team.name}
        description={team.description}
        meta={
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge tone="purple">{team.department}</Badge>
            <StatusBadge status={team.status} kind="generic" />
            <span className="text-xs text-muted">Created {formatDate(String(team.createdAt).slice(0, 10))}</span>
          </div>
        }
        actions={
          <>
            <Button variant="secondary" icon={Edit} onClick={() => setEditOpen(true)}>
              Edit team
            </Button>
            <Button variant="dangerSoft" icon={Trash2} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={`Members (${members.length})`} description="Everyone assigned to this team" />
            {members.length === 0 ? (
              <EmptyState compact icon={Users} title="No members yet" description="Add people from the edit panel." actionLabel="Edit team" onAction={() => setEditOpen(true)} />
            ) : (
              <ul className="divide-y divide-line">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={m.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{m.name}</p>
                      <p className="truncate text-xs text-muted">{m.title || m.role} · {m.email}</p>
                    </div>
                    {m.id === team.leadId && <Badge tone="blue" icon={UserCog}>Team lead</Badge>}
                    <StatusBadge status={m.status} kind="generic" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Meetings" description={`${meetings.length} meeting${meetings.length === 1 ? '' : 's'} owned by this team`} />
            {meetings.length === 0 ? (
              <EmptyState compact icon={CalendarDays} title="No meetings" description="Schedule a meeting and assign it to this team." actionLabel="Create meeting" onAction={() => navigate(`/meetings/create?teamId=${team.id}`)} />
            ) : (
              <ul className="divide-y divide-line">
                {meetings.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => navigate(`/meetings/${m.id}`)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{m.title}</span>
                        <span className="block text-xs text-muted">
                          {companyName(m.companyId)} · {relativeDay(m.date)}, {formatTime(m.startTime)}
                        </span>
                      </span>
                      <StatusBadge status={m.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Action items" description="Owned by this team or raised in its meetings" />
            {actionItems.length === 0 ? (
              <EmptyState compact icon={CheckSquare} title="No action items" description="Follow-ups raised by this team appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {actionItems.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={users.find((u) => u.id === a.assigneeId)?.name || 'Unassigned'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{a.title}</p>
                      <p className="text-xs text-muted">Due {relativeDay(a.dueDate)}</p>
                    </div>
                    <PriorityBadge priority={a.priority} />
                    <StatusBadge status={a.status} kind="generic" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Team information" />
          <dl className="divide-y divide-line px-5">
            {[
              ['Department', team.department, Building2],
              ['Team lead', lead?.name || 'Unassigned', UserCog],
              ['Members', String(members.length), Users],
              ['Meetings', String(meetings.length), CalendarDays],
              ['Open action items', String(actionItems.filter((a) => a.status !== 'Done').length), CheckSquare],
            ].map(([label, value, Icon]) => (
              <div key={label} className="flex items-center gap-3 py-3.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <dt className="flex-1 text-xs text-muted">{label}</dt>
                <dd className="text-[13px] font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <TeamFormModal
        open={editOpen}
        team={team}
        users={users}
        onClose={() => setEditOpen(false)}
        onSubmit={(values) => {
          updateTeam(team.id, values)
          toast('Team updated successfully.')
          setEditOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${team.name}?`}
        description="Members keep their accounts. Meetings assigned to this team lose their team link."
        onConfirm={() => {
          removeTeam(team.id)
          toast('Team deleted.')
          navigate('/teams')
        }}
      />
    </div>
  )
}

export default TeamDetails
