import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cx } from '../../utils/format'

const Pagination = ({ page, totalPages, onChange, count, pageSize }) => {
  if (count === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-muted">
        Showing {from}–{to} of {count}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-xs text-muted">…</span>}
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                'h-8 min-w-8 rounded-lg px-2 text-[13px] font-medium transition-colors',
                p === page ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
