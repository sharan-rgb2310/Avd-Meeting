import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle2, accent: 'text-success', bar: 'bg-success' },
  error: { icon: AlertCircle, accent: 'text-danger', bar: 'bg-danger' },
  info: { icon: Info, accent: 'text-brand', bar: 'bg-brand' },
  warning: { icon: AlertCircle, accent: 'text-warning', bar: 'bg-warning' },
}

const ToastStack = ({ items = [], onDismiss }) => {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-stretch sm:items-end"
      role="region"
      aria-live="polite"
    >
      {items.map((t) => {
        const config = CONFIG[t.variant] || CONFIG.success
        const Icon = config.icon
        return (
          <div
            key={t.id}
            className="relative flex w-full sm:w-[340px] items-start gap-3 overflow-hidden rounded-xl border border-line bg-white px-4 py-3 shadow-pop animate-slide-in-right"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${config.bar}`} aria-hidden="true" />
            <Icon size={17} className={`${config.accent} mt-0.5 shrink-0`} aria-hidden="true" />
            <p className="flex-1 text-[13px] text-ink leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss?.(t.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}

export default ToastStack
