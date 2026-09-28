import { AlertTriangle, RotateCcw } from 'lucide-react'
import Button from '../ui/Button'

const ErrorState = ({
  title = 'Something went wrong',
  description = 'The page could not be loaded. Try again, and the data will reload from your workspace.',
  onRetry,
}) => (
  <div className="card flex flex-col items-center px-6 py-14 text-center">
    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-danger">
      <AlertTriangle size={22} aria-hidden="true" />
    </span>
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
    {onRetry && (
      <Button className="mt-4" variant="secondary" icon={RotateCcw} onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
)

export default ErrorState
