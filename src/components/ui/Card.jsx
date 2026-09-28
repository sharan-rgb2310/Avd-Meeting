import { cx } from '../../utils/format'

export const CardHeader = ({ title, description, action, className }) => (
  <div className={cx('flex items-start justify-between gap-3 px-5 py-4 border-b border-line', className)}>
    <div className="min-w-0">
      <h2 className="text-[15px] font-semibold text-ink truncate">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
    {action}
  </div>
)

const Card = ({ className, children, as: Tag = 'div', ...props }) => (
  <Tag className={cx('card', className)} {...props}>
    {children}
  </Tag>
)

export default Card
