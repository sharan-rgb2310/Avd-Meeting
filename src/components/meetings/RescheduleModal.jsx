import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import TimeInput from '../ui/TimeInput'
import { required } from '../../utils/validators'

const RescheduleModal = ({ open, onClose, meeting, onSubmit }) => {
  const [values, setValues] = useState({ date: '', startTime: '', reason: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open && meeting) {
      setValues({ date: meeting.date, startTime: meeting.startTime, reason: '' })
      setErrors({})
    }
  }, [open, meeting])

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const submit = () => {
    const next = {}
    if (required(values.date)) next.date = 'Pick a new date.'
    if (required(values.startTime)) next.startTime = 'Set a new start time.'
    if (required(values.reason)) next.reason = 'Add a short reason so participants know why.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule meeting"
      description={meeting?.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Reschedule</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New date" type="date" value={values.date} onChange={set('date')} error={errors.date} />
        <TimeInput label="New start time" value={values.startTime} onChange={set('startTime')} error={errors.startTime} />
        <div className="sm:col-span-2">
          <Textarea label="Reason" value={values.reason} onChange={set('reason')} error={errors.reason} placeholder="Customer finance lead unavailable on the original date." />
        </div>
      </div>
      <p className="mt-3 hint">The meeting status changes to Rescheduled once you save.</p>
    </Modal>
  )
}

export default RescheduleModal
