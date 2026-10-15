import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { cx } from '../../utils/format'

const Dropdown = ({ trigger, children, align = 'right', className, panelClassName }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    menuRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus()
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close(true)
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [])]
      if (!items.length) return
      e.preventDefault()
      const current = items.indexOf(document.activeElement)
      const nextIndex = e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : e.key === 'ArrowDown'
            ? (current + 1) % items.length
            : (current <= 0 ? items.length : current) - 1
      items[nextIndex].focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerElement = trigger({
    open,
    toggle: () => setOpen((value) => !value),
    close: () => close(),
  })

  return (
    <div ref={ref} className={cx('relative', className)}>
      {isValidElement(triggerElement)
        ? cloneElement(triggerElement, {
            ref: triggerRef,
            'aria-haspopup': 'menu',
            'aria-expanded': open,
            'aria-controls': menuId,
          })
        : triggerElement}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
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
      tone === 'danger' ? 'text-danger hover:bg-red-50' : 'text-ink hover:bg-slate-100',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
    )}
    {...props}
  >
    {Icon && <Icon size={15} aria-hidden="true" />}
    {children}
  </button>
)

export const DropdownDivider = () => <div className="my-1 h-px bg-line" />

export default Dropdown
