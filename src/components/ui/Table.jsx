import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cx } from '../../utils/format'
import Checkbox from './Checkbox'
import LoadingSkeleton from '../common/LoadingSkeleton'

/**
 * Column: { key, header, render?, sortable?, className?, headerClassName?, width? }
 */
const Table = ({
  columns = [],
  rows = [],
  loading = false,
  rowKey = (r) => r.id,
  onRowClick,
  selectable = false,
  selected = [],
  onSelectChange,
  sort,
  onSortChange,
  emptyState,
  skeletonRows = 6,
}) => {
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(rowKey(r)))

  const toggleAll = (checked) => {
    if (!onSelectChange) return
    const ids = rows.map(rowKey)
    onSelectChange(checked ? Array.from(new Set([...selected, ...ids])) : selected.filter((id) => !ids.includes(id)))
  }

  const toggleOne = (id, checked) => {
    if (!onSelectChange) return
    onSelectChange(checked ? [...selected, id] : selected.filter((s) => s !== id))
  }

  const handleSort = (key) => {
    if (!onSortChange) return
    if (sort?.key === key) onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    else onSortChange({ key, dir: 'asc' })
  }

  if (loading) return <LoadingSkeleton variant="table" rows={skeletonRows} />
  if (!rows.length && emptyState) return emptyState

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-line bg-slate-50/70">
            {selectable && (
              <th scope="col" className="w-10 px-4 py-2.5">
                <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cx('px-4 py-2.5 text-left text-xs font-semibold text-muted', col.headerClassName)}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.sortKey || col.key)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                  >
                    {col.header}
                    {sort?.key === (col.sortKey || col.key) ? (
                      sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    ) : (
                      <ChevronsUpDown size={13} className="opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = rowKey(row)
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  'border-b border-line/70 last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-brand-50/40',
                  selected.includes(id) && 'bg-brand-50/50'
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(id)}
                      onChange={(checked) => toggleOne(id, checked)}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cx('table-cell', col.className)}>
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Table
