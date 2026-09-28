import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../../utils/format'

const Select = ({ label, error, hint, options = [], placeholder, className, id, size = 'md', ...props }) => {
  const generated = useId()
  const fieldId = id || generated
  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          className={cx(
            'w-full appearance-none rounded-[10px] border bg-white pl-3 pr-9 text-[13px] text-ink',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand',
            size === 'sm' ? 'h-9' : 'h-10',
            error ? 'border-danger' : 'border-line',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value
            const text = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={value} value={value}>
                {text}
              </option>
            )
          })}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 hint">{hint}</p> : null}
    </div>
  )
}

export default Select
