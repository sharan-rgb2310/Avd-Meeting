import Avatar from './Avatar'
import { cx } from '../../utils/format'

const AvatarGroup = ({ names = [], max = 4, size = 'sm', className }) => {
  const visible = names.slice(0, max)
  const overflow = names.length - visible.length
  return (
    <div className={cx('flex items-center -space-x-2', className)}>
      {visible.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size={size} ring />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-muted ring-2 ring-white">
          +{overflow}
        </span>
      )}
      <span className="sr-only">{names.join(', ')}</span>
    </div>
  )
}

export default AvatarGroup
