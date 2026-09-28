import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import Avatar from './Avatar'
import { cx } from '../../utils/format'

/**
 * Participant picker: searchable, multi-select, with removable chips.
 * options: [{ value, label, description }]
 */
const MultiSelect = ({ label, options = [], value = [], onChange, placeholder = 'Search people…', error, emptyText = 'No matches.' }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q)
    )
  }, [options, query])

  const toggle = (val) => {
    onChange?.(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
  }

  const selectedOptions = options.filter((o) => value.includes(o.value))

  return (
    <div ref={ref}>
      {label && <span className="field-label">{label}</span>}
      <div
        className={cx(
          'rounded-[10px] border bg-white transition-colors',
          error ? 'border-danger' : open ? 'border-brand ring-2 ring-brand/25' : 'border-line'
        )}
      >
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 pb-0">
            {selectedOptions.map((opt) => (
              <span key={opt.value} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-1.5 text-xs text-brand-700">
                <Avatar name={opt.label} size="xs" />
                {opt.label}
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  aria-label={`Remove ${opt.label}`}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-label={label || 'Search options'}
            className="h-10 w-full rounded-[10px] bg-transparent pl-9 pr-3 text-[13px] placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        {open && (
          <div className="max-h-56 overflow-y-auto border-t border-line p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-muted">{emptyText}</p>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    aria-pressed={checked}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                      checked ? 'bg-brand-50' : 'hover:bg-slate-100'
                    )}
                  >
                    <Avatar name={opt.label} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{opt.label}</span>
                      {opt.description && <span className="block truncate text-xs text-muted">{opt.description}</span>}
                    </span>
                    {checked && <Check size={15} className="text-brand" />}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

export default MultiSelect
