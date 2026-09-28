import { cx } from '../../utils/format'

const TONES = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-brand-50 text-brand-700 border-brand-100',
  navy: 'bg-navy-50 text-navy border-slate-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
}

const Badge = ({ tone = 'neutral', children, className, dot = false, icon: Icon }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
      TONES[tone] || TONES.neutral,
      className
    )}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />}
    {Icon && <Icon size={12} aria-hidden="true" />}
    {children}
  </span>
)

export default Badge
