import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  CheckSquare,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { KEYS, getData } from '../services/storageService'
import { updateUser } from '../services/usersService'
import { changePassword } from '../services/authService'
import { DEPARTMENTS } from '../data/seedData'

import { isEmail } from '../utils/validators'

const stamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

const Field = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 px-5 py-3.5 border-b border-line last:border-b-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      <Icon size={15} />
    </span>
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-ink break-words">{value || '—'}</p>
    </div>
  </div>
)

const Profile = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, logout } = useAuth()
  const loading = useLoading(300)

  const [teams] = useStore(() => getData(KEYS.teams, []))
  const [meetings] = useStore(() => getData(KEYS.meetings, []))
  const [actionItems] = useStore(() => getData(KEYS.actionItems, []))

  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const team = teams.find((t) => t.id === user?.teamId)

  const stats = useMemo(() => {
    if (!user) return { meetings: 0, actions: 0 }
    const mine = meetings.filter(
      (m) => m.createdBy === user.id || (m.participants || []).some((p) => p.userId === user.id)
    )
    const actions = actionItems.filter((a) => a.assigneeId === user.id && a.status !== 'Done')
    return { meetings: mine.length, actions: actions.length }
  }, [meetings, actionItems, user])

  if (loading || !user) {
    return (
      <div className="space-y-5">
        <PageHeader title="Profile" description="Your account details and preferences." />
        <LoadingSkeleton variant="page" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        description="Your account details and workspace preferences."
        actions={
          <>
            <Button variant="secondary" icon={KeyRound} onClick={() => setPasswordOpen(true)}>
              Change password
            </Button>
            <Button icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="bg-navy px-5 py-6 text-center">
            <Avatar name={user.name} size="xl" className="mx-auto ring-4 ring-white/10" />
            <h2 className="mt-3 text-base font-semibold text-white">{user.name}</h2>
            <p className="mt-0.5 text-xs text-slate-300">{user.title || user.role}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge tone="cyan">{user.role}</Badge>
              <StatusBadge value={user.status} />
            </div>
          </div>
          <div>
            <Field icon={Mail} label="Email address" value={user.email} />
            <Field icon={Phone} label="Phone" value={user.phone} />
            <Field icon={Users} label="Team" value={team?.name} />
            <Field icon={Building2} label="Department" value={user.department} />
            <Field icon={ShieldCheck} label="Authentication method" value={user.authMethod} />
            <Field icon={Clock} label="Last login" value={stamp(user.lastSeen) || 'Never'} />
          </div>
          <div className="border-t border-line p-4">
            <Button
              variant="dangerSoft"
              icon={LogOut}
              className="w-full justify-center"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Log out
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  <CalendarDays size={16} />
                </span>
                <span className="text-2xl font-semibold text-ink">{stats.meetings}</span>
              </div>
              <p className="mt-3 text-[13px] font-medium text-ink">My meetings</p>
              <p className="mt-0.5 text-xs text-muted">Meetings you organise or attend.</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <CheckSquare size={16} />
                </span>
                <span className="text-2xl font-semibold text-ink">{stats.actions}</span>
              </div>
              <p className="mt-3 text-[13px] font-medium text-ink">Open action items</p>
              <p className="mt-0.5 text-xs text-muted">Assigned to you and not yet done.</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Account" description="How this account is configured in the workspace." />
            <Field icon={ShieldCheck} label="Role" value={user.role} />
            <Field icon={Building2} label="Job title" value={user.title} />
            <Field icon={Clock} label="Member since" value={stamp(user.createdAt) || '—'} />
          </Card>
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        teams={teams}
        onSaved={() => {
          setEditOpen(false)
          toast('Profile updated successfully.')
        }}
      />

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        userId={user.id}
        onSaved={() => {
          setPasswordOpen(false)
          toast('Password changed successfully.')
        }}
      />
    </div>
  )
}

const EditProfileModal = ({ open, onClose, user, teams, onSaved }) => {
  const [values, setValues] = useState(user)
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  if (!open) return null

  const submit = () => {
    const next = {}
    if (!values.name?.trim()) next.name = 'Please enter a name.'
    if (!values.email?.trim()) next.email = 'Please enter an email address.'
    else if (!isEmail(values.email)) next.email = 'Please enter a valid email address.'
    setErrors(next)
    if (Object.keys(next).length) return
    updateUser(user.id, {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone,
      title: values.title,
      department: values.department,
      teamId: values.teamId,
    })
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="Update your personal details."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save changes</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={values.name || ''} onChange={set('name')} error={errors.name} />
        <Input label="Email address" type="email" value={values.email || ''} onChange={set('email')} error={errors.email} />
        <Input label="Phone" value={values.phone || ''} onChange={set('phone')} />
        <Input label="Job title" value={values.title || ''} onChange={set('title')} />
        <Select label="Department" options={DEPARTMENTS} placeholder="Select department" value={values.department || ''} onChange={set('department')} />
        <Select
          label="Team"
          options={teams.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="No team"
          value={values.teamId || ''}
          onChange={set('teamId')}
        />
      </div>
    </Modal>
  )
}

const ChangePasswordModal = ({ open, onClose, userId, onSaved }) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const submit = async () => {
    if (!current || !next) return setError('Please fill in every field.')
    if (next !== confirm) return setError('The new passwords do not match.')
    setLoading(true)
    try {
      const result = await changePassword(userId, { current, next })
      if (!result.ok) return setError(result.error)
      setCurrent('')
      setNext('')
      setConfirm('')
      setError('')
      return onSaved()
    } catch (submitError) {
      setError(submitError.message || 'Password update failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      description="Choose a new password of at least 8 characters."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={submit}>Update password</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Current password"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Enter your current password"
          trailing={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
              className="rounded-md p-1.5 text-muted hover:text-ink"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
        <Input
          label="New password"
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Enter a new password"
        />
        <Input
          label="Confirm new password"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter the new password"
          error={error}
        />
      </div>
    </Modal>
  )
}

export default Profile
