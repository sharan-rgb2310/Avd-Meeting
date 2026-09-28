import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import Logo from '../common/Logo'
import { NavList, SidebarFooter } from './Sidebar'

const MobileSidebar = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-navy-950/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-navy animate-slide-in-left"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Logo size="sm" tone="light" />
          <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={17} />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <SidebarFooter onNavigate={onClose} />
      </aside>
    </div>,
    document.body
  )
}

export default MobileSidebar
