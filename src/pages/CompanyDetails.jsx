import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Activity, Building2, CalendarDays, CheckSquare, Edit, FileText, Globe, Mail, MapPin, Phone, Plus, Trash2, User,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import PriorityBadge from '../components/ui/PriorityBadge'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import CompanyFormModal from '../components/companies/CompanyFormModal'
import ActionItemFormModal from '../components/meetings/ActionItemFormModal'
import { KEYS, getData } from '../services/storageService'
import { removeCompany, updateCompany } from '../services/companiesService'
import { createActionItem } from '../services/actionItemsService'
import { listActivity } from '../services/dashboardService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { fileSize, formatDate, formatTime, relativeDay, timeAgo } from '../utils/format'

const InfoRow = ({ icon: Icon, label, value, href }) => (
  <div className="flex items-start gap-3 py-2.5">
    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand">
      <Icon size={14} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-brand hover:underline">
          {value || '—'}
        </a>
      ) : (
        <p className="truncate text-[13px] font-medium text-ink">{value || '—'}</p>
      )}
    </div>
  </div>
)

const CompanyDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(340)

  const [company] = useStore(() => getData(KEYS.companies, []).find((c) => c.id === id) || null, [id])
  const [meetings] = useStore(() => getData(KEYS.meetings, []).filter((m) => m.companyId === id), [id])
  const [actionItems] = useStore(() => getData(KEYS.actionItems, []).filter((a) => a.companyId === id), [id])
  const [documents] = useStore(() => getData(KEYS.documents, []).filter((d) => d.companyId === id), [id])
  const [users] = useStore(() => getData(KEYS.users, []))
  const [allMeetings] = useStore(() => getData(KEYS.meetings, []))
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [activity] = useStore(() => listActivity().filter((a) => a.companyId === id), [id])

  const [editOpen, setEditOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const openActions = useMemo(() => actionItems.filter((a) => a.status !== 'Done'), [actionItems])

  if (loading) return <LoadingSkeleton rows={6} />
  if (!company) {
    return (
      <ErrorState
        title="Company not found"
        description="This company may have been deleted. Go back to the company list to pick another."
        onRetry={() => navigate('/companies')}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        back
        title={company.name}
        description={company.notes}
        meta={
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={company.status} kind="generic" />
            <Badge tone="purple">{company.industry}</Badge>
            {company.location && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <MapPin size={13} /> {company.location}
              </span>
            )}
          </div>
        }
        actions={
          <>
            <Button variant="secondary" icon={Edit} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="secondary" icon={CheckSquare} onClick={() => setActionOpen(true)}>
              Create action item
            </Button>
            <Button icon={Plus} onClick={() => navigate(`/meetings/create?companyId=${company.id}`)}>
              Create meeting
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
            <CardHeader
              title="Recent meetings"
              description={`${meetings.length} meeting${meetings.length === 1 ? '' : 's'} with this company`}
            />
            {meetings.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarDays}
                title="No meetings yet"
                description="Schedule the first meeting with this company."
                actionLabel="Create meeting"
                onAction={() => navigate(`/meetings/create?companyId=${company.id}`)}
              />
            ) : (
              <ul className="divide-y divide-line">
                {meetings.slice(0, 6).map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/meetings/${m.id}`)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{m.title}</span>
                        <span className="block text-xs text-muted">
                          {relativeDay(m.date)} · {formatTime(m.startTime)}
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
            <CardHeader title="Open action items" description={`${openActions.length} still outstanding`} />
            {openActions.length === 0 ? (
              <EmptyState compact icon={CheckSquare} title="Nothing outstanding" description="Every follow-up for this company is complete." />
            ) : (
              <ul className="divide-y divide-line">
                {openActions.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
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

          <Card>
            <CardHeader title="Documents" description={`${documents.length} file${documents.length === 1 ? '' : 's'} linked to this company`} />
            {documents.length === 0 ? (
              <EmptyState compact icon={FileText} title="No documents" description="Upload a document from the Documents page and link it to this company." actionLabel="Go to documents" onAction={() => navigate('/documents')} />
            ) : (
              <ul className="divide-y divide-line">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <Badge tone="blue">{d.type}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{d.name}</span>
                    <span className="text-xs text-muted">{fileSize(d.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact information" />
            <div className="divide-y divide-line px-5 py-1">
              <InfoRow icon={User} label="Primary contact" value={company.contactName} />
              <InfoRow icon={Mail} label="Email" value={company.email} href={`mailto:${company.email}`} />
              <InfoRow icon={Phone} label="Phone" value={company.phone} href={`tel:${company.phone}`} />
              <InfoRow icon={Globe} label="Website" value={company.website} href={company.website ? `https://${company.website}` : undefined} />
              <InfoRow icon={Building2} label="Industry" value={company.industry} />
              <InfoRow icon={CalendarDays} label="Added" value={formatDate(String(company.createdAt).slice(0, 10))} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity timeline" />
            {activity.length === 0 ? (
              <EmptyState compact icon={Activity} title="No activity yet" description="Changes to meetings and action items for this company appear here." />
            ) : (
              <ol className="px-5 py-4">
                {activity.slice(0, 8).map((a, i, arr) => (
                  <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden="true" />}
                    <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand bg-white" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-snug text-ink">{a.message}</p>
                      <p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <CompanyFormModal
        open={editOpen}
        company={company}
        onClose={() => setEditOpen(false)}
        onSubmit={(values) => {
          updateCompany(company.id, values)
          toast('Company updated successfully.')
          setEditOpen(false)
        }}
      />

      <ActionItemFormModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        meetings={allMeetings}
        companies={companies}
        users={users}
        lockedCompanyId={company.id}
        onSubmit={(values) => {
          createActionItem(values, user?.name)
          toast('Action item created.')
          setActionOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${company.name}?`}
        description="Meetings and action items stay in the workspace, but they will no longer be linked to this company."
        onConfirm={() => {
          removeCompany(company.id)
          toast('Company deleted successfully.')
          navigate('/companies')
        }}
      />
    </div>
  )
}

export default CompanyDetails
