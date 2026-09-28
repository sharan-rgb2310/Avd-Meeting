import { useId } from 'react'
import { cx } from '../../utils/format'

const Textarea = ({ label, error, hint, className, id, rows = 3, ...props }) => {
  const generated = useId()
  const fieldId = id || generated
  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        className={cx(
          'w-full rounded-[10px] border bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-slate-400 leading-relaxed',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand resize-y',
          error ? 'border-danger' : 'border-line',
          className
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 hint">{hint}</p> : null}
    </div>
  )
}

export default Textarea
