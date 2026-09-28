import { forwardRef, useId } from 'react'
import { cx } from '../../utils/format'

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, trailing, className, id, containerClassName, ...props },
  ref
) {
  const generated = useId()
  const inputId = id || generated
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cx(
            'w-full h-10 rounded-[10px] border bg-white text-[13px] text-ink placeholder:text-slate-400',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand',
            'disabled:bg-slate-50 disabled:text-muted',
            Icon ? 'pl-9' : 'pl-3',
            trailing ? 'pr-10' : 'pr-3',
            error ? 'border-danger focus:ring-danger/20 focus:border-danger' : 'border-line',
            className
          )}
          {...props}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export default Input
