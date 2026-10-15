import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Logo from '../components/common/Logo'
import {
  completePasswordReset,
  hasPasswordRecoverySession,
  markPasswordRecoverySession,
} from '../services/authService'
import { supabase } from '../utils/supabase'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      setError('Password reset requires a Supabase connection.')
      return undefined
    }

    let active = true
    let receivedRecoveryEvent = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session && active) {
        receivedRecoveryEvent = true
        markPasswordRecoverySession()
        setAuthorized(true)
        setError('')
        setChecking(false)
      }
    })

    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        if (sessionError) {
          setError(sessionError.message)
        } else if (data.session && (hasPasswordRecoverySession() || receivedRecoveryEvent)) {
          setAuthorized(true)
        } else {
          setError('This reset link is invalid or has expired. Request a new one.')
        }
      })
      .catch((sessionError) => {
        if (active) setError(sessionError.message || 'The reset link could not be verified.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const result = await completePasswordReset(password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setComplete(true)
    } catch (resetError) {
      setError(resetError.message || 'Password could not be updated. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <Logo size="lg" tone="dark" />
        <h1 className="mt-7 text-[26px] font-semibold tracking-tight text-ink">
          {complete ? 'Password updated' : 'Choose a new password'}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {complete
            ? 'Your password has been changed. Continue to your workspace.'
            : 'Enter and confirm the new password for your account.'}
        </p>

        {checking ? (
          <p className="mt-7 text-sm text-muted" role="status">Verifying your reset link…</p>
        ) : complete ? (
          <div className="mt-7">
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <CheckCircle2 size={17} aria-hidden="true" />
              Password changed successfully.
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
              Continue
            </Button>
          </div>
        ) : !authorized ? (
          <div className="mt-7">
            <p role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger">
              {error || 'This reset link is invalid or has expired.'}
            </p>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form className="mt-7 space-y-4" noValidate onSubmit={submit}>
            {error && (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger">
                {error}
              </p>
            )}
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              icon={Lock}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your new password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              icon={Lock}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
            />
            <p className="hint">Use at least 8 characters.</p>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}

export default ResetPassword
