import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Select from '../ui/Select'
import MultiSelect from '../ui/MultiSelect'
import { PARTICIPANT_TYPES } from '../../data/seedData'

const AddParticipantModal = ({ open, onClose, users = [], existingIds = [], onSubmit }) => {
  const [selected, setSelected] = useState([])
  const [type, setType] = useState('Team Member')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setSelected([])
      setType('Team Member')
      setError('')
    }
  }, [open])

  const available = users.filter((u) => !existingIds.includes(u.id))

  const submit = () => {
    if (!selected.length) return setError('Select at least one person to add.')
    onSubmit(selected, type)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add participants"
      description="Everyone added receives this meeting on their workspace calendar."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Add participants</Button>
        </>
      }
    >
      <div className="space-y-4">
        <MultiSelect
          label="People"
          options={available.map((u) => ({ value: u.id, label: u.name, description: `${u.role} · ${u.department || 'No department'}` }))}
          value={selected}
          onChange={(ids) => {
            setSelected(ids)
            setError('')
          }}
          error={error}
          emptyText="Everyone in the workspace is already on this meeting."
        />
        <Select label="Participant type" value={type} onChange={(e) => setType(e.target.value)} options={PARTICIPANT_TYPES} />
      </div>
    </Modal>
  )
}

export default AddParticipantModal
