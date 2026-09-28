import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cx } from '../../utils/format'

const PageHeader = ({ title, description, actions, back = false, meta, className }) => {
  const navigate = useNavigate()
  return (
    <header className={cx('flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="min-w-0 flex items-start gap-3">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="mt-0.5 rounded-lg border border-line bg-white p-2 text-muted transition-colors hover:bg-slate-50 hover:text-ink"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-ink truncate">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          {meta}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export default PageHeader
