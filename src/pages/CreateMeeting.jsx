import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import MeetingForm, { emptyMeeting } from '../components/meetings/MeetingForm'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { KEYS, getData } from '../services/storageService'
import { createMeeting } from '../services/meetingsService'
import { pushNotification } from '../services/notificationsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatTime } from '../utils/format'

export const toParticipants = (ids, organizerId) =>
  ids.map((id, i) => ({ userId: id, type: id === organizerId || (!organizerId && i === 0) ? 'Organizer' : 'Team Member' }))

const CreateMeeting = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(300)
  const [params] = useSearchParams()

  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [teams] = useStore(() => getData(KEYS.teams, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const initial = useMemo(() => {
    const teamId = params.get('teamId') || ''
    const team = teams.find((t) => t.id === teamId)
    return {
      ...emptyMeeting(),
      companyId: params.get('companyId') || '',
      // Opened from a team page: keep the team link and pre-fill its department.
      ...(team ? { teamId: team.id, department: team.department || '' } : {}),
      createdBy: user?.id || '',
      participantIds: user ? [user.id] : [],
    }
  }, [params, user, teams])

  const save = (values, status) => {
    const { participantIds, ...rest } = values
    const meeting = createMeeting(
      {
        ...rest,
        status: status || rest.status,
        createdBy: user?.id,
        participants: toParticipants(participantIds, user?.id),
      },
      user?.name
    )
    pushNotification({
      type: 'meeting',
      title: `${meeting.title} was scheduled`,
      body: `${formatDate(meeting.date)} at ${formatTime(meeting.startTime)}.`,
      link: `/meetings/${meeting.id}`,
    })
    return meeting
  }

  if (loading) return <LoadingSkeleton rows={8} />

  return (
    <div className="space-y-5">
      <PageHeader back title="Create meeting" description="Schedule a meeting and invite the people who need to be there." />
      <MeetingForm
        title="Meeting details"
        description="Everything here can be changed later from the meeting page."
        initialValues={initial}
        companies={companies}
        teams={teams}
        users={users}
        submitLabel="Create meeting"
        onSubmit={(values) => {
          const meeting = save(values)
          toast('Meeting created successfully.')
          navigate(`/meetings/${meeting.id}`)
        }}
        onSaveDraft={(values) => {
          const meeting = save(values, 'On Hold')
          toast('Draft saved. The meeting is on hold until you publish it.', 'info')
          navigate(`/meetings/${meeting.id}`)
        }}
      />
    </div>
  )
}

export default CreateMeeting
