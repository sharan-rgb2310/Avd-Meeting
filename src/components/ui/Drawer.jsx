import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const Drawer = ({ open, onClose, title, children, side = 'right' }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy-950/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full w-[min(88vw,320px)] bg-white shadow-panel flex flex-col ${
          side === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body
  )
}

export default Drawer
