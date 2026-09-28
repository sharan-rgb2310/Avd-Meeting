import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx, pad } from '../../utils/format'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

// Split a stored 24-hour "HH:mm" value into 12-hour parts.
const parse = (value) => {
  if (!value || !value.includes(':')) return { hour: '', minute: '', period: 'AM' }
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour: '', minute: '', period: 'AM' }
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: h >= 12 ? 'PM' : 'AM' }
}

// 12-hour time picker (hour / minute / AM-PM). The value it reads and reports
// stays a 24-hour "HH:mm" string, so saved data and everything that formats
// times keeps working. onChange receives a change-style event like Input does.
const TimeInput = ({ label, value, onChange, error, hint, id, className }) => {
  const generated = useId()
  const fieldId = id || generated
  const { hour, minute, period } = parse(value)

  const emit = (next) => {
    const h12 = next.hour === '' ? 12 : Number(next.hour)
    const m = next.minute === '' ? 0 : Number(next.minute)
    const h24 = (h12 % 12) + (next.period === 'PM' ? 12 : 0)
    onChange({ target: { value: `${pad(h24)}:${pad(m)}` } })
  }

  const minuteOptions = minute !== '' && !MINUTES.includes(minute) ? [...MINUTES, minute].sort((a, b) => a - b) : MINUTES

  const selectClass = cx(
    'h-10 w-full appearance-none rounded-[10px] border bg-white pl-3 pr-7 text-[13px] text-ink',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand',
    error ? 'border-danger' : 'border-line'
  )
  const chevron = (
    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
  )

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <div className="flex gap-2" role="group" aria-label={label}>
        <div className="relative flex-1">
          <select id={fieldId} aria-label="Hour" aria-invalid={error ? 'true' : undefined} className={selectClass} value={hour} onChange={(e) => emit({ hour: e.target.value, minute, period })}>
            {hour === '' && <option value="">--</option>}
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          {chevron}
        </div>
        <div className="relative flex-1">
          <select aria-label="Minute" className={selectClass} value={minute} onChange={(e) => emit({ hour, minute: e.target.value, period })}>
            {minute === '' && <option value="">--</option>}
            {minuteOptions.map((m) => (
              <option key={m} value={m}>{pad(m)}</option>
            ))}
          </select>
          {chevron}
        </div>
        <div className="relative flex-1">
          <select aria-label="AM or PM" className={selectClass} value={period} onChange={(e) => emit({ hour, minute, period: e.target.value })}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          {chevron}
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 hint">{hint}</p> : null}
    </div>
  )
}

export default TimeInput
