import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import MeetingForm from '../components/meetings/MeetingForm'
import RescheduleModal from '../components/meetings/RescheduleModal'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { KEYS, getData } from '../services/storageService'
import { rescheduleMeeting, updateMeeting } from '../services/meetingsService'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { toParticipants } from './CreateMeeting'
import { meetingDepartment } from '../utils/meetingHelpers'

const EditMeeting = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const loading = useLoading(300)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const [meeting] = useStore(() => getData(KEYS.meetings, []).find((m) => m.id === id) || null, [id])
  const [companies] = useStore(() => getData(KEYS.companies, []))
  const [teams] = useStore(() => getData(KEYS.teams, []))
  const [users] = useStore(() => getData(KEYS.users, []))

  const initial = useMemo(() => {
    if (!meeting) return null
    return {
      ...meeting,
      // Meetings saved before Department existed fall back to their team's department.
      department: meetingDepartment(meeting, teams),
      companyName: meeting.companyName || '',
      responsibleId: meeting.responsibleId || '',
      actionItemsText: meeting.actionItemsText || '',
      remarks: meeting.remarks || '',
      participantIds: (meeting.participants || []).map((p) => p.userId),
    }
  }, [meeting, teams])

  if (loading) return <LoadingSkeleton rows={8} />
  if (!meeting || !initial) {
    return <ErrorState title="Meeting not found" description="This meeting may have been deleted." onRetry={() => navigate('/meetings')} />
  }

  const organizerId = meeting.participants?.find((p) => p.type === 'Organizer')?.userId || meeting.createdBy

  return (
    <div className="space-y-5">
      <PageHeader back title="Edit meeting" description={meeting.title} />
      <MeetingForm
        title="Meeting details"
        description="Changes save to your workspace immediately."
        initialValues={initial}
        companies={companies}
        teams={teams}
        users={users}
        submitLabel="Save changes"
        onReschedule={() => setRescheduleOpen(true)}
        onSubmit={({ participantIds, createdBy, ...values }) => {
          updateMeeting(meeting.id, { ...values, participants: toParticipants(participantIds, organizerId) }, user?.name)
          toast('Meeting updated successfully.')
          navigate(`/meetings/${meeting.id}`)
        }}
      />
      <RescheduleModal
        open={rescheduleOpen}
        meeting={meeting}
        onClose={() => setRescheduleOpen(false)}
        onSubmit={(values) => {
          rescheduleMeeting(meeting.id, values, user?.name)
          toast('Meeting rescheduled successfully.')
          setRescheduleOpen(false)
          navigate(`/meetings/${meeting.id}`)
        }}
      />
    </div>
  )
}

export default EditMeeting
