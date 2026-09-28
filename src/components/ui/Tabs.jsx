import { cx } from '../../utils/format'

const Tabs = ({ tabs = [], value, onChange, className }) => (
  <div className={cx('flex items-center gap-1 border-b border-line overflow-x-auto', className)} role="tablist">
    {tabs.map((tab) => {
      const id = typeof tab === 'string' ? tab : tab.value
      const label = typeof tab === 'string' ? tab : tab.label
      const Icon = typeof tab === 'string' ? null : tab.icon
      const count = typeof tab === 'string' ? undefined : tab.count
      const active = id === value
      return (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange?.(id)}
          className={cx(
            'relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition-colors',
            active ? 'text-brand' : 'text-muted hover:text-ink'
          )}
        >
          {Icon && <Icon size={15} aria-hidden="true" />}
          {label}
          {count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-[11px]', active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-muted')}>
              {count}
            </span>
          )}
          {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      )
    })}
  </div>
)

export default Tabs
