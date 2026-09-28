import { Search, X } from 'lucide-react'
import { cx } from '../../utils/format'

const SearchBar = ({ value, onChange, placeholder = 'Search…', className, ariaLabel }) => (
  <div className={cx('relative', className)}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      className="h-9 w-full rounded-[10px] border border-line bg-white pl-9 pr-8 text-[13px] text-ink placeholder:text-slate-400 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink"
      >
        <X size={14} />
      </button>
    )}
  </div>
)

export default SearchBar
