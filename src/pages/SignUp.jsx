import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck2, CheckSquare, Eye, EyeOff, FolderOpen, Lock, Mail, User, Users2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Logo from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { validateSignup } from '../utils/validators'
import { supabase } from '../utils/supabase'

const FEATURES = [
  { icon: CalendarCheck2, label: 'Centralized meeting management' },
  { icon: CheckSquare, label: 'Action item tracking' },
  { icon: Users2, label: 'Team collaboration' },
  { icon: FolderOpen, label: 'Document organization' },
]

// Mirrors Login's BrandPanel so the Sign Up route reads as part of the same
// authentication experience rather than a separate template.
const BrandPanel = () => (
  <section className="relative hidden overflow-hidden bg-navy lg:flex lg:w-[54%] lg:flex-col lg:justify-between">
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

const SignUp = () => {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setFormError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const fieldErrors = validateSignup(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length) return
    setLoading(true)
    try {
      const result = await signup(values)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      if (result.needsEmailConfirmation) {
        toast('Check your email to confirm your account, then sign in.', 'info')
        navigate('/login', { replace: true })
        return
      }
      toast('Welcome to AV DYNAMICS.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(error.message || 'Account creation failed. Please try again.')
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
          <div className="w-full max-w-[420px] animate-scale-in">
            <span className="mb-6 hidden lg:inline-flex">
              <Logo size="lg" tone="dark" />
            </span>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">Create your account</h1>
            <p className="mt-1.5 text-[13px] text-muted">
              Set up your AV DYNAMICS workspace to manage meetings, teams and follow-ups in one place.
            </p>

            <form className="mt-7 space-y-4" noValidate onSubmit={submit}>
              {formError && (
                <div role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger transition-opacity">
                  {formError}
                </div>
              )}

              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                icon={User}
                placeholder="Enter your full name"
                value={values.name}
                onChange={set('name')}
                error={errors.name}
              />

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
                autoComplete="new-password"
                icon={Lock}
                placeholder="Create a password"
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

              <Input
                label="Confirm password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                icon={Lock}
                placeholder="Re-enter your password"
                value={values.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand hover:text-brand-700">
                Sign in
              </Link>
            </p>

            <p className="mt-8 text-center text-[11px] text-muted">
              AV DYNAMICS Meeting Management · {supabase ? 'Data syncs to your account.' : 'Demo data stays in this browser.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SignUp
