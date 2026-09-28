import { TrendingUp, TrendingDown } from 'lucide-react'
import { cx } from '../../utils/format'

const ACCENTS = {
  blue: 'bg-brand-50 text-brand',
  cyan: 'bg-cyan-50 text-cyan-600',
  navy: 'bg-navy-50 text-navy',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-danger',
  purple: 'bg-violet-50 text-violet-600',
}

// Optional soft highlight for the primary summary cards: light tinted surface,
// matching border and a slightly stronger icon chip. Cards without `highlight`
// keep the standard white look.
const HIGHLIGHTS = {
  blue: { card: 'border-brand-300 bg-brand-100', chip: 'bg-brand-200 text-brand-700' },
  green: { card: 'border-emerald-300 bg-emerald-100', chip: 'bg-emerald-200 text-emerald-700' },
  orange: { card: 'border-amber-300 bg-amber-100', chip: 'bg-amber-200 text-amber-700' },
}

const StatCard = ({ label, value, icon: Icon, accent = 'blue', highlight, trend, comparison, onClick }) => {
  const tint = HIGHLIGHTS[highlight]
  const positive = trend >= 0
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'card p-4 text-left transition-shadow',
        tint?.card,
        onClick && 'hover:shadow-pop cursor-pointer w-full'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cx('inline-flex h-8 w-8 items-center justify-center rounded-[10px]', tint ? tint.chip : ACCENTS[accent])}>
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2.5 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {(trend !== undefined || comparison) && (
        <p className="mt-3 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={cx('inline-flex items-center gap-1 font-medium', positive ? 'text-success' : 'text-danger')}>
              {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {positive ? '+' : ''}
              {trend}%
            </span>
          )}
          {comparison && <span className="text-muted">{comparison}</span>}
        </p>
      )}
    </Tag>
  )
}

export default StatCard
