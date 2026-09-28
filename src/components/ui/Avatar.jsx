import { cx, initials } from '../../utils/format'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-16 w-16 text-lg',
}

const PALETTE = [
  'bg-brand-600', 'bg-cyan-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-navy', 'bg-sky-600', 'bg-rose-500',
]

const colorFor = (seed = '') => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 3)) % 997
  return PALETTE[hash % PALETTE.length]
}

const Avatar = ({ name = '', size = 'md', className, ring = false }) => (
  <span
    className={cx(
      'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
      SIZES[size],
      colorFor(name),
      ring && 'ring-2 ring-white',
      className
    )}
    title={name}
    aria-hidden="true"
  >
    {initials(name) || '?'}
  </span>
)

export default Avatar
