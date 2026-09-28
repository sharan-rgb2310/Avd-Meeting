import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck2, CheckSquare, Eye, EyeOff, FolderOpen, Lock, Mail, Users2, MailCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Checkbox from '../components/ui/Checkbox'
import Modal from '../components/ui/Modal'
import Logo from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { requestPasswordReset } from '../services/authService'
import { isEmail, validateLogin } from '../utils/validators'
import { supabase } from '../utils/supabase'

const FEATURES = [
  { icon: CalendarCheck2, label: 'Centralized meeting management' },
  { icon: CheckSquare, label: 'Action item tracking' },
  { icon: Users2, label: 'Team collaboration' },
  { icon: FolderOpen, label: 'Document organization' },
]

const BrandPanel = () => (
  <section className="relative hidden overflow-hidden bg-navy lg:flex lg:w-[54%] lg:flex-col lg:justify-between">
    {/* corporate meeting-grid motif with a soft radial glow */}
    <div
      className="absolute inset-0 opacity-[0.16]"
      style={{
        backgroundImage:
          'linear-gradient(to right, #38BDF8 1px, transparent 1px), linear-gradient(to bottom, #38BDF8 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }}
      aria-hidden="true"
    />
    <div
      className="absolute -left-24 top-16 h-[420px] w-[420px] rounded-full blur-3xl"
      style={{ background: 'radial-gradient(circle, rgba(56,189,248,.28) 0%, rgba(11,23,54,0) 70%)' }}
      aria-hidden="true"
    />
    <div
      className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full blur-3xl"
      style={{ background: 'radial-gradient(circle, rgba(37,99,235,.35) 0%, rgba(11,23,54,0) 70%)' }}
      aria-hidden="true"
    />
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" fill="none" aria-hidden="true">
      <g stroke="#38BDF8" strokeOpacity="0.32" strokeWidth="1">
        <path d="M120 250 L300 180 L470 300" />
        <path d="M300 180 L340 420 L120 250" />
        <path d="M340 420 L470 300 L520 520" />
        <path d="M340 420 L200 560 L120 250" />
        <path d="M200 560 L520 520" />
      </g>
      {[[120, 250], [300, 180], [470, 300], [340, 420], [200, 560], [520, 520]].map(([cx2, cy], i) => (
        <g key={i}>
          <circle cx={cx2} cy={cy} r="14" fill="#0B1736" stroke="#38BDF8" strokeOpacity="0.55" />
          <circle cx={cx2} cy={cy} r="4.5" fill="#38BDF8" />
        </g>
      ))}
    </svg>

    <div className="relative px-12 pt-12">
      <Logo size="md" tone="light" />
    </div>

    <div className="relative px-12 pb-16">
      <p className="text-[11px] font-medium tracking-[0.22em] text-accent">MEETING MANAGEMENT</p>
      <h1 className="mt-4 max-w-md text-[32px] font-semibold leading-[1.2] tracking-tight text-white">
        Connect teams. Organize meetings. Move work forward.
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
        One workspace for every meeting, follow-up and document your teams and customers share.
      </p>
      <ul className="mt-9 space-y-3.5">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-sm text-slate-200">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.07] text-accent ring-1 ring-white/10">
              <Icon size={14} aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  </section>
)

const ForgotPasswordModal = ({ open, onClose }) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    onClose()
    setTimeout(() => {
      setSent(false)
      setEmail('')
      setError('')
    }, 200)
  }

  const submit = () => {
    if (!email.trim()) return setError('Enter your email address.')
    if (!isEmail(email)) return setError('Enter a valid email address.')
    setError('')
    setBusy(true)
    requestPasswordReset(email)
    setBusy(false)
    setSent(true)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={sent ? 'Reset link simulated' : 'Reset your password'}
      description={sent ? undefined : 'Enter the email address on your AV DYNAMICS account.'}
      size="sm"
      footer={
        sent ? (
          <Button onClick={close}>Back to sign in</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button loading={busy} onClick={submit}>
              Send reset link
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3.5">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-brand-700">
            This frontend demo runs without a mail server, so no email was sent. In a connected workspace a reset link
            would go to <span className="font-medium">{email}</span>.
          </p>
        </div>
      ) : (
        <>
          <Input
            label="Email address"
            type="email"
            icon={Mail}
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
          <p className="mt-3 hint">For this frontend demo, password reset is simulated.</p>
        </>
      )}
    </Modal>
  )
}

const Login = () => {
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setFormError('')
  }

  const signIn = async (credentials) => {
    const fieldErrors = validateLogin(credentials)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length) return
    setLoading(true)
    try {
      const result = await login({ ...credentials, remember })
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      toast('Welcome back to AV DYNAMICS.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(error.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <BrandPanel />

      <main className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo size="sm" tone="dark" />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[420px]">
            <span className="mb-6 hidden lg:inline-flex">
              <Logo size="lg" tone="dark" />
            </span>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1.5 text-[13px] text-muted">Sign in to your Meeting Management workspace.</p>

            <form
              className="mt-7 space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                signIn(values)
              }}
            >
              {formError && (
                <div role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger">
                  {formError}
                </div>
              )}

              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                icon={Mail}
                placeholder="Enter your email address"
                value={values.email}
                onChange={set('email')}
                error={errors.email}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                icon={Lock}
                placeholder="Enter your password"
                value={values.password}
                onChange={set('password')}
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                {!supabase && <Checkbox label="Remember me" checked={remember} onChange={setRemember} />}
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-[13px] font-medium text-brand hover:text-brand-700"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-muted">
              New to AV DYNAMICS?{' '}
              <Link to="/signup" className="font-medium text-brand hover:text-brand-700">
                Create an account
              </Link>
            </p>

            <p className="mt-8 text-center text-[11px] text-muted">
              AV DYNAMICS Meeting Management · {supabase ? 'Data syncs to your account.' : 'Demo data stays in this browser.'}
            </p>
          </div>
        </div>
      </main>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  )
}

export default Login
