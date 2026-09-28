import { useId } from 'react'
import { Check } from 'lucide-react'
import { cx } from '../../utils/format'

const Checkbox = ({ label, checked, onChange, id, className, disabled, ...props }) => {
  const generated = useId()
  const fieldId = id || generated
  return (
    <label
      htmlFor={fieldId}
      className={cx('inline-flex items-center gap-2 text-[13px] text-ink', disabled ? 'opacity-60' : 'cursor-pointer', className)}
    >
      <span className="relative inline-flex">
        <input
          id={fieldId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked, e)}
          className="peer h-4 w-4 appearance-none rounded-[5px] border border-line bg-white transition-colors checked:border-brand checked:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          {...props}
        />
        <Check
          size={12}
          strokeWidth={3}
          className="pointer-events-none absolute left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}

export default Checkbox
