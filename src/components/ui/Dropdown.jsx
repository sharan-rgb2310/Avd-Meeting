import { useEffect, useRef, useState } from 'react'
import { cx } from '../../utils/format'

const Dropdown = ({ trigger, children, align = 'right', className, panelClassName }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cx('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) })}
      {open && (
        <div
          role="menu"
          className={cx(
            'absolute z-40 mt-2 min-w-[180px] rounded-xl border border-line bg-white p-1.5 shadow-pop animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName
          )}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}

export const DropdownItem = ({ icon: Icon, children, onClick, tone = 'default', ...props }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={cx(
      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors text-left',
      tone === 'danger' ? 'text-danger hover:bg-red-50' : 'text-ink hover:bg-slate-100'
    )}
    {...props}
  >
    {Icon && <Icon size={15} aria-hidden="true" />}
    {children}
  </button>
)

export const DropdownDivider = () => <div className="my-1 h-px bg-line" />

export default Dropdown
