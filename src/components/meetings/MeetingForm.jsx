import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, Save, Send } from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import MultiSelect from '../ui/MultiSelect'
import TimeInput from '../ui/TimeInput'
import { MEETING_STATUSES, MEETING_TYPES } from '../../data/seedData'
import { validateMeeting } from '../../utils/validators'
import { todayKey } from '../../utils/format'
import { MANUAL_COMPANY, userName } from '../../utils/meetingHelpers'

export const emptyMeeting = () => ({
  title: '', companyId: '', companyName: '', date: todayKey(), startTime: '10:00',
  type: 'Virtual', location: '', meetingLink: '', status: 'Scheduled', responsibleId: '', createdBy: '',
  agenda: '', notes: '', decisions: '', actionItemsText: '', remarks: '', participantIds: [],
})

const MeetingForm = ({ initialValues, companies, users, onSubmit, onSaveDraft, onReschedule, submitLabel = 'Create meeting', title, description }) => {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  // Company is either picked from the list or typed in when it isn't there yet.
  const [manualCompany, setManualCompany] = useState(Boolean(!initialValues.companyId && initialValues.companyName))

  const setCompany = (e) => {
    const value = e.target.value
    if (value === MANUAL_COMPANY) {
      setManualCompany(true)
      setValues((v) => ({ ...v, companyId: '' }))
    } else {
      setManualCompany(false)
      setValues((v) => ({ ...v, companyId: value, companyName: '' }))
    }
    setErrors((prev) => ({ ...prev, companyId: undefined, companyName: undefined }))
  }

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const participantOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.name, description: `${u.role} · ${u.department || 'No department'}` })),
    [users]
  )

  const submit = (e) => {
    e.preventDefault()
    const next = validateMeeting(values, { manualCompany })
    setErrors(next)
    if (Object.keys(next).length) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-3">
      <Card className="order-1 lg:col-span-2">
        <CardHeader
          title={title}
          description={description}
          action={
            onReschedule && (
              <Button type="button" size="sm" variant="secondary" icon={Repeat} onClick={onReschedule}>
                Reschedule
              </Button>
            )
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Meeting title" value={values.title} onChange={set('title')} error={errors.title} placeholder="Q3 Strategy Alignment" containerClassName="sm:col-span-2" />
          <Select
            label="Company"
            value={manualCompany ? MANUAL_COMPANY : values.companyId}
            onChange={setCompany}
            error={errors.companyId}
            placeholder="Select a company"
            options={[...companies.map((c) => ({ value: c.id, label: c.name })), { value: MANUAL_COMPANY, label: 'Not listed — enter manually' }]}
          />
          {manualCompany && (
            <Input label="Company name" value={values.companyName} onChange={set('companyName')} error={errors.companyName} placeholder="Enter company name" containerClassName="sm:col-span-2" />
          )}

          {/* Meeting Type — directly after Company */}
          <Select label="Meeting type" value={values.type} onChange={set('type')} options={MEETING_TYPES} />

          {/* Conditional link / location — full width so Meeting date stays on its own row */}
          {values.type === 'Virtual' && (
            <Input label="Virtual Meeting Link" type="url" value={values.meetingLink || ''} onChange={set('meetingLink')} placeholder="https://..." containerClassName="sm:col-span-2" />
          )}
          {values.type === 'In Person' && (
            <Input label="Location" value={values.location || ''} onChange={set('location')} placeholder="Enter meeting location" containerClassName="sm:col-span-2" />
          )}
          {values.type === 'Hybrid' && (
            <>
              <Input label="Virtual Meeting Link" type="url" value={values.meetingLink || ''} onChange={set('meetingLink')} placeholder="https://..." />
              <Input label="Location" value={values.location || ''} onChange={set('location')} placeholder="Enter meeting location" />
            </>
          )}

          <Input label="Meeting date" type="date" value={values.date} onChange={set('date')} error={errors.date} />
          <TimeInput label="Start time" value={values.startTime} onChange={set('startTime')} error={errors.startTime} />

          <Select label="Status" value={values.status} onChange={set('status')} options={MEETING_STATUSES} />
          <Select label="Responsible" value={values.responsibleId} onChange={set('responsibleId')} placeholder="Select a person" options={users.map((u) => ({ value: u.id, label: u.name }))} />
          <Input label="Created by" value={userName(values.createdBy, users) || '—'} readOnly disabled hint="Set automatically from your account." />

          <div className="sm:col-span-2 border-t pt-4 mt-2 space-y-4">
            <Textarea label="Agenda" value={values.agenda} onChange={set('agenda')} rows={3} placeholder="Discuss Q3 strategy, targets and roadmap." />
            <Textarea label="Notes" value={values.notes} onChange={set('notes')} rows={3} placeholder="Prepared updated sales deck and market analysis." />
            <Textarea label="Decisions" value={values.decisions} onChange={set('decisions')} rows={2} placeholder="Recorded after the meeting." />
            <Textarea label="Action items" value={values.actionItemsText} onChange={set('actionItemsText')} rows={3} placeholder={'Send updated quotation\nShare technical datasheet\nFollow up with client'} />
            <Textarea label="Remarks" value={values.remarks} onChange={set('remarks')} rows={2} placeholder="Any additional comments about this meeting." />
          </div>
        </div>
      </Card>

      <Card className="order-2">
        <CardHeader title="Participants" description="Search and add anyone in the workspace" />
        <div className="p-5">
          <MultiSelect
            options={participantOptions}
            value={values.participantIds}
            onChange={(ids) => setValues((v) => ({ ...v, participantIds: ids }))}
            placeholder="Search people by name or role…"
          />
          <p className="mt-3 hint">
            {values.participantIds.length} participant{values.participantIds.length === 1 ? '' : 's'} selected. The first
            person added is recorded as the organizer.
          </p>
        </div>
      </Card>

      {/* Full-width footer row with action buttons */}
      <Card className="order-3 lg:col-span-3 p-4">
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          {onSaveDraft && (
            <Button type="button" variant="secondary" icon={Save} onClick={() => onSaveDraft(values)}>
              Save draft
            </Button>
          )}
          <Button type="submit" icon={Send}>
            {submitLabel}
          </Button>
        </div>
      </Card>
    </form>
  )
}

export default MeetingForm
