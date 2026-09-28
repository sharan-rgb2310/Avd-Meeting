import { RotateCcw } from 'lucide-react'
import Select from '../ui/Select'
import SearchBar from './SearchBar'
import Button from '../ui/Button'

/**
 * filters: [{ key, placeholder, options, value, onChange }]
 */
const FilterBar = ({ search, onSearchChange, searchPlaceholder, filters = [], onReset, trailing, canReset }) => (
  <div className="flex flex-col gap-2.5 border-b border-line p-3 lg:flex-row lg:items-center">
    {onSearchChange && (
      <SearchBar value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="lg:w-72" />
    )}
    <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
      {filters.map((f) => (
        <Select
          key={f.key}
          size="sm"
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          options={f.options}
          placeholder={f.placeholder}
          aria-label={f.placeholder}
          className="min-w-[140px]"
        />
      ))}
      {trailing}
      {onReset && canReset && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  </div>
)

export default FilterBar
