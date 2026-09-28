import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Building2, CalendarDays, CheckSquare, Clock, Edit, FileText, Link as LinkIcon, ListChecks, MapPin, MessageSquare,
  Plus, Repeat, StickyNote, Trash2, UserCheck, UserPlus, Users2, Video, X,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import Tabs from '../components/ui/Tabs'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import PriorityBadge from '../components/ui/PriorityBadge'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import RescheduleModal from '../components/meetings/RescheduleModal'
import AddParticipantModal from '../components/meetings/AddParticipantModal'
import ActionItemFormModal from '../components/meetings/ActionItemFormModal'
import DocumentUploadModal from '../components/documents/DocumentUploadModal'
import { KEYS, getData } from '../services/storageService'
import {
  addParticipant, removeMeeting, removeParticipant, rescheduleMeeting, setMeetingStatus,
} from '../services/meetingsService'
import { createActionItem, removeActionItem } from '../services/actionItemsService'
import { createDocument, removeDocument } from '../services/documentsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { MEETING_STATUSES } from '../data/seedData'
import { fileSize, formatDate, formatTime, relativeDay } from '../utils/format'
import { meetingCompanyName } from '../utils/meetingHelpers'

const meetingTypeLabels = {
  Virtual: 'Virtual Meeting',
  'In Person': 'In-Person Meeting',
  Hybrid: 'Hybrid Meeting',
}

const meetingLinkHref = (value) => {
  if (!value) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

const Field = ({ icon: Icon, label, children, action }) => (
  <div className="flex gap-3 px-5 py-3.5">
    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
      <Icon size={14} aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-ink">{children}</div>
    </div>
    {action}
  </div>
)

const MeetingDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(340)

  const [meeting] = useStore(() => getData(KEYS.meetings, []).find((m) => m.id === id) || null, [id])
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [users] = useStore(() => getData(KEYS.users, []))
  const [actionItems] = useStore(() => getData(KEYS.actionItems, []).filter((a) => a.meetingId === id), [id])
  const [documents] = useStore(() => getData(KEYS.documents, []).filter((d) => d.meetingId === id), [id])

  const [tab, setTab] = useState('meeting')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [participantOpen, setParticipantOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const creator = users.find((u) => u.id === meeting?.createdBy)
  const responsible = users.find((u) => u.id === meeting?.responsibleId)
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  if (loading) return <LoadingSkeleton rows={7} />
  if (!meeting) {
    return <ErrorState title="Meeting not found" description="This meeting may have been deleted. Pick another from the meeting list." onRetry={() => navigate('/meetings')} />
  }

  const participants = meeting.participants || []

  return (
    <div className="space-y-5">
      <PageHeader
        back
        title={meeting.title}
        meta={
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} /> {meetingCompanyName(meeting, companies) || 'No company'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} /> {formatDate(meeting.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> {formatTime(meeting.startTime)}
            </span>
            <StatusBadge status={meeting.status} />
            <Badge tone="neutral">{meeting.ref}</Badge>
          </div>
        }
        actions={
          <>
            <Select
              size="sm"
              value={meeting.status}
              onChange={(e) => {
                setMeetingStatus(meeting.id, e.target.value, user?.name)
                toast(`Status changed to ${e.target.value}.`)
              }}
              options={MEETING_STATUSES}
              aria-label="Meeting status"
              className="w-[150px]"
            />
            <Button variant="secondary" icon={Repeat} onClick={() => setRescheduleOpen(true)}>
              Reschedule
            </Button>
            <Button icon={Edit} onClick={() => navigate(`/meetings/${meeting.id}/edit`)}>
              Edit meeting
            </Button>
            <Button variant="dangerSoft" icon={Trash2} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'meeting', label: 'Meeting', icon: ListChecks },
          { value: 'actions', label: 'Action items', icon: CheckSquare, count: actionItems.length },
          { value: 'documents', label: 'Documents', icon: FileText, count: documents.length },
        ]}
      />

      {tab === 'meeting' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Meeting information" description="Everything captured before, during and after the call" />
            <div className="divide-y divide-line">
              <Field icon={CalendarDays} label="Meeting type">
                {meetingTypeLabels[meeting.type] || meeting.type || 'Virtual Meeting'}
              </Field>
              {(meeting.type === 'In Person' || meeting.type === 'Hybrid') && (
                <Field icon={MapPin} label="Location">
                  {meeting.location || 'No location added.'}
                </Field>
              )}
              {(meeting.type === 'Virtual' || meeting.type === 'Hybrid') && (
                <Field icon={Video} label="Virtual Meeting Link">
                  {meeting.meetingLink ? (
                    meetingLinkHref(meeting.meetingLink) ? (
                      <a href={meetingLinkHref(meeting.meetingLink)} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">
                        {meeting.meetingLink}
                      </a>
                    ) : meeting.meetingLink
                  ) : 'No virtual meeting link added.'}
                </Field>
              )}
              <Field icon={UserCheck} label="Responsible">
                {responsible?.name || 'Not assigned'}
              </Field>
              <Field icon={Users2} label="Created by">
                {creator?.name || 'Unknown'}
              </Field>
              <Field icon={ListChecks} label="Action items">
                {meeting.actionItemsText || 'No action items recorded.'}
              </Field>
              <Field icon={StickyNote} label="Remarks">
                {meeting.remarks || 'No remarks.'}
              </Field>
              <Field
                icon={ListChecks}
                label="Agenda"
                action={
                  <Button size="sm" variant="secondary" icon={Repeat} className="self-start" onClick={() => setRescheduleOpen(true)}>
                    Reschedule
                  </Button>
                }
              >
                {meeting.agenda || 'No agenda recorded.'}
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <Clock size={12} aria-hidden="true" /> {formatDate(meeting.date)} · {formatTime(meeting.startTime)}
                </span>
              </Field>
              <Field icon={MessageSquare} label="Notes">
                {meeting.notes || 'No notes yet.'}
              </Field>
              <Field icon={CheckSquare} label="Decisions">
                {meeting.decisions || 'No decisions recorded yet.'}
              </Field>
              {meeting.rescheduleReason && (
                <Field icon={Repeat} label="Reschedule reason">
                  {meeting.rescheduleReason}
                </Field>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`Participants (${participants.length})`}
              action={
                <Button size="sm" variant="soft" icon={UserPlus} onClick={() => setParticipantOpen(true)}>
                  Add
                </Button>
              }
            />
            {participants.length === 0 ? (
              <EmptyState compact icon={UserPlus} title="No participants" description="Add the people who should attend." actionLabel="Add participant" onAction={() => setParticipantOpen(true)} />
            ) : (
              <ul className="divide-y divide-line">
                {participants.map((p) => {
                  const person = userById[p.userId]
                  return (
                    <li key={p.userId} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={person?.name || 'Unknown'} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{person?.name || 'Removed user'}</p>
                        <p className="truncate text-xs text-muted">{p.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeParticipant(meeting.id, p.userId)
                          toast('Participant removed.', 'info')
                        }}
                        aria-label={`Remove ${person?.name || 'participant'}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'actions' && (
        <Card>
          <CardHeader
            title="Action items"
            description="Follow-ups captured from this meeting"
            action={
              <Button size="sm" icon={Plus} onClick={() => setActionOpen(true)}>
                Create action item
              </Button>
            }
          />
          {actionItems.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No action items yet" description="Capture what the team agreed to do next." actionLabel="Create action item" actionIcon={Plus} onAction={() => setActionOpen(true)} />
          ) : (
            <ul className="divide-y divide-line">
              {actionItems.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Avatar name={userById[a.assigneeId]?.name || 'Unassigned'} size="sm" />
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[13px] font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-muted">Due {relativeDay(a.dueDate)} · {userById[a.assigneeId]?.name || 'Unassigned'}</p>
                  </div>
                  <PriorityBadge priority={a.priority} />
                  <StatusBadge status={a.status} kind="generic" />
                  <button
                    type="button"
                    onClick={() => setPendingAction(a)}
                    aria-label={`Delete ${a.title}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'documents' && (
        <Card>
          <CardHeader
            title="Documents"
            description="Files shared for this meeting"
            action={
              <Button size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>
                Upload document
              </Button>
            }
          />
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Attach the deck, notes or contract discussed in this meeting." actionLabel="Upload document" onAction={() => setUploadOpen(true)} />
          ) : (
            <ul className="divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge tone="blue">{d.type}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{d.name}</span>
                  <span className="hidden text-xs text-muted sm:block">{fileSize(d.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      removeDocument(d.id)
                      toast('Document deleted.', 'info')
                    }}
                    aria-label={`Delete ${d.name}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <RescheduleModal
        open={rescheduleOpen}
        meeting={meeting}
        onClose={() => setRescheduleOpen(false)}
        onSubmit={(values) => {
          rescheduleMeeting(meeting.id, values, user?.name)
          toast('Meeting rescheduled successfully.')
          setRescheduleOpen(false)
        }}
      />

      <AddParticipantModal
        open={participantOpen}
        onClose={() => setParticipantOpen(false)}
        users={users}
        existingIds={participants.map((p) => p.userId)}
        onSubmit={(ids, type) => {
          ids.forEach((uid2) => addParticipant(meeting.id, uid2, type))
          toast(`${ids.length} participant${ids.length === 1 ? '' : 's'} added.`)
          setParticipantOpen(false)
        }}
      />

      <ActionItemFormModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        meetings={[meeting]}
        companies={companies}
        users={users}
        lockedMeetingId={meeting.id}
        onSubmit={(values) => {
          createActionItem({ ...values, companyId: values.companyId || meeting.companyId }, user?.name)
          toast('Action item created.')
          setActionOpen(false)
        }}
      />

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        meetings={[meeting]}
        companies={companies}
        lockedMeetingId={meeting.id}
        onSubmit={(values) => {
          createDocument({ ...values, uploadedBy: user?.id, companyId: values.companyId || meeting.companyId }, user?.name)
          toast('Document uploaded.')
          setUploadOpen(false)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={`Delete ${pendingAction?.title}?`}
        description="The action item is removed from the board and this meeting."
        onConfirm={() => {
          removeActionItem(pendingAction.id)
          toast('Action item deleted.')
          setPendingAction(null)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${meeting.title}?`}
        description="This removes the meeting and its documents. Action items stay in the workspace without a meeting link."
        onConfirm={() => {
          removeMeeting(meeting.id)
          toast('Meeting deleted successfully.')
          navigate('/meetings')
        }}
      />
    </div>
  )
}

export default MeetingDetails
