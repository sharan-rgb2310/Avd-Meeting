import { Loader2 } from 'lucide-react'
import { cx } from '../../utils/format'

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-700 active:bg-brand-700 shadow-sm disabled:bg-brand/50',
  navy: 'bg-navy text-white hover:bg-navy-700 active:bg-navy-950 shadow-sm disabled:bg-navy/50',
  secondary: 'bg-white text-ink border border-line hover:bg-slate-50 active:bg-slate-100 disabled:text-muted',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100',
  ghost: 'text-muted hover:text-ink hover:bg-slate-100',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 disabled:bg-danger/50',
  dangerSoft: 'bg-red-50 text-danger border border-red-100 hover:bg-red-100',
  success: 'bg-success text-white hover:bg-emerald-600',
}

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-sm gap-2 rounded-[10px]',
  icon: 'h-8 w-8 rounded-lg justify-center',
}

const Button = ({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className,
  children,
  disabled,
  ...props
}) => (
  <Tag
    className={cx(
      'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none',
      'disabled:cursor-not-allowed disabled:opacity-70',
      VARIANTS[variant],
      SIZES[size],
      className
    )}
    disabled={Tag === 'button' ? disabled || loading : undefined}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? (
      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
    ) : (
      Icon && <Icon size={size === 'lg' ? 17 : 15} aria-hidden="true" />
    )}
    {children}
    {IconRight && !loading && <IconRight size={15} aria-hidden="true" />}
  </Tag>
)

export default Button
