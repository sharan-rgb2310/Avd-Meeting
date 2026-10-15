import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { AUTH_METHODS, DEPARTMENTS, USER_STATUSES } from '../../data/seedData'
import { isEmail, required } from '../../utils/validators'

const EMPTY = {
  name: '', email: '', role: '', status: 'Invited', authMethod: 'Email',
  teamId: '', department: 'Sales', phone: '', title: '',
}

const UserFormModal = ({
  open,
  onClose,
  onSubmit,
  user,
  selfEdit = false,
  cloudMode = false,
  canAssignAdmin = false,
  teams = [],
  existingEmails = [],
}) => {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

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

  const submit = async () => {
    const next = {}
    if (required(values.name)) next.name = 'Enter the person’s name.'
    if (required(values.email)) next.email = 'Enter an email address.'
    else if (!isEmail(values.email)) next.email = 'Enter a valid email address.'
    else if (existingEmails.includes(values.email.trim().toLowerCase()) && values.email !== user?.email)
      next.email = 'Someone in the workspace already uses this email.'
    if (!selfEdit && !values.role?.trim()) next.role = 'Enter a role to assign this account.'
    else if (values.role?.trim().length > 80) next.role = 'Role must be 80 characters or fewer.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selfEdit ? 'Edit your profile' : user ? 'Edit user' : cloudMode ? 'Invite user' : 'Add user'}
      description={
        selfEdit
          ? 'Update your own account details. Admin access is limited to three accounts.'
          : user
            ? cloudMode
              ? 'Update this account’s directory details.'
              : 'Update this local directory entry.'
            : cloudMode
              ? 'Send an email invitation to create a Supabase account.'
              : 'Add a local directory entry. Account invitations require Supabase.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {selfEdit || user ? 'Save changes' : cloudMode ? 'Send invite' : 'Add user'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Sarah Parker" />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={set('email')}
          readOnly={Boolean(user)}
          error={errors.email}
          placeholder="sarah@avdynamics.com"
        />
        <Input label="Job title" value={values.title} onChange={set('title')} placeholder="Product Designer" />
        <Input label="Phone" value={values.phone} onChange={set('phone')} placeholder="+1 415 220 8812" />
        {!selfEdit && (
          <Input
            label="Role"
            value={values.role || ''}
            onChange={set('role')}
            placeholder="Enter role"
            error={errors.role}
            maxLength={80}
            disabled={cloudMode && !canAssignAdmin}
            hint={cloudMode
              ? canAssignAdmin
                ? 'Admin access is limited to three accounts.'
                : 'Only an existing administrator can change another user’s role.'
              : 'Enter the role for this local directory entry.'}
          />
        )}
        <Select label="Department" value={values.department} onChange={set('department')} options={DEPARTMENTS} />
        {!cloudMode && !selfEdit && (
          <>
            <Select label="Status" value={values.status} onChange={set('status')} options={USER_STATUSES} />
            <Select label="Authentication method" value={values.authMethod} onChange={set('authMethod')} options={AUTH_METHODS} />
            <Select label="Team" value={values.teamId} onChange={set('teamId')} placeholder="No team" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          </>
        )}
      </div>
    </Modal>
  )
}

export default UserFormModal
