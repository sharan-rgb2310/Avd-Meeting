import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import MultiSelect from '../ui/MultiSelect'
import { DEPARTMENTS } from '../../data/seedData'
import { required } from '../../utils/validators'

const EMPTY = { name: '', department: 'Sales', leadId: '', memberIds: [], status: 'Active', description: '' }

const TeamFormModal = ({ open, onClose, onSubmit, team, users = [] }) => {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setValues(team ? { ...EMPTY, ...team } : EMPTY)
      setErrors({})
    }
  }, [open, team])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const submit = () => {
    const next = {}
    if (required(values.name)) next.name = 'Enter a team name.'
    if (required(values.leadId)) next.leadId = 'Choose a team lead.'
    setErrors(next)
    if (Object.keys(next).length) return
    const memberIds = Array.from(new Set([...(values.memberIds || []), values.leadId]))
    onSubmit({ ...values, memberIds })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team ? 'Edit team' : 'Create team'}
      description={team ? 'Update the team and its members.' : 'Group people so meetings and action items roll up to a team.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{team ? 'Save changes' : 'Create team'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Team name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Direct Sales North America" containerClassName="sm:col-span-2" />
        <Select label="Department" value={values.department} onChange={set('department')} options={DEPARTMENTS} />
        <Select label="Team lead" value={values.leadId} onChange={set('leadId')} error={errors.leadId} placeholder="Select a lead" options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <Select label="Status" value={values.status} onChange={set('status')} options={['Active', 'Inactive']} />
        <div className="sm:col-span-2">
          <MultiSelect
            label="Members"
            options={users.map((u) => ({ value: u.id, label: u.name, description: `${u.role} · ${u.department || 'No department'}` }))}
            value={values.memberIds || []}
            onChange={(ids) => setValues((v) => ({ ...v, memberIds: ids }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" value={values.description} onChange={set('description')} placeholder="What this team owns." />
        </div>
      </div>
    </Modal>
  )
}

export default TeamFormModal
