import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { AUTH_METHODS, DEPARTMENTS, ROLES, USER_STATUSES } from '../../data/seedData'
import { isEmail, required } from '../../utils/validators'

const EMPTY = {
  name: '', email: '', role: 'Editor', status: 'Invited', authMethod: 'Email',
  teamId: '', department: 'Sales', phone: '', title: '',
}

const UserFormModal = ({ open, onClose, onSubmit, user, teams = [], existingEmails = [] }) => {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setValues(user ? { ...EMPTY, ...user } : EMPTY)
      setErrors({})
    }
  }, [open, user])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // Accounts created before the role change may hold a role that is no longer
  // offered (e.g. Admin). Keep it selectable while editing so it isn't overwritten.
  const roleOptions = user?.role && !ROLES.includes(user.role) ? [user.role, ...ROLES] : ROLES

  const submit = () => {
    const next = {}
    if (required(values.name)) next.name = 'Enter the person’s name.'
    if (required(values.email)) next.email = 'Enter an email address.'
    else if (!isEmail(values.email)) next.email = 'Enter a valid email address.'
    else if (existingEmails.includes(values.email.trim().toLowerCase()) && values.email !== user?.email)
      next.email = 'Someone in the workspace already uses this email.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Edit user' : 'Add user'}
      description={user ? 'Update this person’s access and details.' : 'Invite someone to the AV DYNAMICS workspace.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{user ? 'Save changes' : 'Add user'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Sarah Parker" />
        <Input label="Email" type="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="sarah@avdynamics.com" />
        <Input label="Job title" value={values.title} onChange={set('title')} placeholder="Product Designer" />
        <Input label="Phone" value={values.phone} onChange={set('phone')} placeholder="+1 415 220 8812" />
        <Select label="Role" value={values.role} onChange={set('role')} options={roleOptions} />
        <Select label="Status" value={values.status} onChange={set('status')} options={USER_STATUSES} />
        <Select label="Authentication method" value={values.authMethod} onChange={set('authMethod')} options={AUTH_METHODS} />
        <Select label="Department" value={values.department} onChange={set('department')} options={DEPARTMENTS} />
        <Select label="Team" value={values.teamId} onChange={set('teamId')} placeholder="No team" options={teams.map((t) => ({ value: t.id, label: t.name }))} containerClassName="sm:col-span-2" />
      </div>
      {!user && <p className="mt-4 hint">New accounts start with the demo password Demo@123 so you can sign in as them.</p>}
    </Modal>
  )
}

export default UserFormModal
