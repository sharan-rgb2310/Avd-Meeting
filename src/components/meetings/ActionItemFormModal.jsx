import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import { ACTION_STATUSES, PRIORITIES } from '../../data/seedData'
import { required } from '../../utils/validators'
import { todayKey } from '../../utils/format'

const EMPTY = {
  title: '', description: '', status: 'To Do', priority: 'Medium',
  dueDate: todayKey(), meetingId: '', companyId: '', assigneeId: '',
}

const ActionItemFormModal = ({ open, onClose, onSubmit, item, meetings = [], companies = [], users = [], lockedMeetingId, lockedCompanyId }) => {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setValues({
      ...EMPTY,
      ...(item || {}),
      meetingId: item?.meetingId || lockedMeetingId || '',
      companyId: item?.companyId || lockedCompanyId || '',
    })
    setErrors({})
  }, [open, item, lockedMeetingId, lockedCompanyId])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => {
      if (key === 'meetingId') {
        const meeting = meetings.find((m) => m.id === value)
        return { ...v, meetingId: value, companyId: meeting?.companyId || v.companyId }
      }
      return { ...v, [key]: value }
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const submit = () => {
    const next = {}
    if (required(values.title)) next.title = 'Give the action item a title.'
    if (required(values.assigneeId)) next.assigneeId = 'Assign this to someone.'
    if (required(values.dueDate)) next.dueDate = 'Set a due date.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit action item' : 'Create action item'}
      description={item ? 'Update the follow-up details.' : 'Capture a follow-up and give it an owner.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{item ? 'Save changes' : 'Create action item'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" value={values.title} onChange={set('title')} error={errors.title} placeholder="Review Q3 sales report" containerClassName="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Description" value={values.description} onChange={set('description')} placeholder="What needs to happen, and what does done look like?" />
        </div>
        <Select label="Assignee" value={values.assigneeId} onChange={set('assigneeId')} error={errors.assigneeId} placeholder="Select a person" options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <Input label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
        <Select label="Priority" value={values.priority} onChange={set('priority')} options={PRIORITIES} />
        <Select label="Status" value={values.status} onChange={set('status')} options={ACTION_STATUSES} />
        <Select label="Meeting" value={values.meetingId} onChange={set('meetingId')} placeholder="No meeting" options={meetings.map((m) => ({ value: m.id, label: m.title }))} disabled={Boolean(lockedMeetingId)} />
        <Select label="Company" value={values.companyId} onChange={set('companyId')} placeholder="No company" options={companies.map((c) => ({ value: c.id, label: c.name }))} disabled={Boolean(lockedCompanyId)} />
      </div>
    </Modal>
  )
}

export default ActionItemFormModal
