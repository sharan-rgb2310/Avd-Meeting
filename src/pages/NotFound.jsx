import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'
import Logo from '../components/common/Logo'

const NotFound = () => {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo size="md" tone="dark" className="mb-8" />
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
        <Compass size={22} aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold text-ink">This page is not part of the workspace</h1>
      <p className="mt-2 max-w-sm text-[13px] text-muted">
        The link may be out of date. Head back to the dashboard to pick up where you left off.
      </p>
      <Button className="mt-5" onClick={() => navigate('/dashboard')}>
        Go to dashboard
      </Button>
    </div>
  )
}

export default NotFound
