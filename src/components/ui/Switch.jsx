import { cx } from '../../utils/format'

const Switch = ({ checked, onChange, label, description, disabled, id }) => (
  <div className="flex items-start justify-between gap-4">
    {(label || description) && (
      <div className="min-w-0">
        {label && (
          <p className="text-[13px] font-medium text-ink" id={id ? `${id}-label` : undefined}>
            {label}
          </p>
        )}
        {description && <p className="mt-0.5 text-xs text-muted leading-relaxed">{description}</p>}
      </div>
    )}
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-labelledby={id && label ? `${id}-label` : undefined}
      aria-label={!label ? 'Toggle setting' : undefined}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-slate-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  </div>
)

export default Switch
