import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, CheckSquare, FileText, Search, Users, CornerDownLeft } from 'lucide-react'
import { KEYS, getData } from '../../services/storageService'
import { cx } from '../../utils/format'
import useDebounce from '../../hooks/useDebounce'

const GROUPS = [
  { key: 'meetings', label: 'Meetings', icon: CalendarDays, storeKey: KEYS.meetings, field: 'title', to: (r) => `/meetings/${r.id}` },
  { key: 'companies', label: 'Companies', icon: Building2, storeKey: KEYS.companies, field: 'name', to: (r) => `/companies/${r.id}` },
  { key: 'actionItems', label: 'Action items', icon: CheckSquare, storeKey: KEYS.actionItems, field: 'title', to: () => '/action-items' },
  { key: 'documents', label: 'Documents', icon: FileText, storeKey: KEYS.documents, field: 'name', to: () => '/documents' },
  { key: 'teams', label: 'Teams', icon: Users, storeKey: KEYS.teams, field: 'name', to: (r) => `/teams/${r.id}` },
  { key: 'users', label: 'Users', icon: Users, storeKey: KEYS.users, field: 'name', to: () => '/users' },
]

const GlobalSearch = ({ className }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const debounced = useDebounce(query, 150)
  const navigate = useNavigate()
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (q.length < 1) return []
    return GROUPS.map((group) => ({
      ...group,
      items: getData(group.storeKey, [])
        .filter((row) => String(row[group.field] || '').toLowerCase().includes(q))
        .slice(0, 4),
    })).filter((group) => group.items.length > 0)
  }, [debounced])

  const flat = useMemo(
    () => results.flatMap((group) => group.items.map((item) => ({ item, group }))),
    [results]
  )

  useEffect(() => setCursor(0), [debounced])

  const go = (entry) => {
    if (!entry) return
    navigate(entry.group.to(entry.item))
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(flat.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(flat[cursor])
    }
  }

  let index = -1

  return (
    <div ref={ref} className={cx('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-label="Search meetings, companies, teams"
        placeholder="Search meetings, companies, teams…"
        className="h-9 w-full rounded-[10px] border border-line bg-slate-50/80 pl-9 pr-14 text-[13px] text-ink placeholder:text-slate-400 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">
        ⌘K
      </kbd>

      {open && query.trim() && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[400px] overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-pop animate-scale-in"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">
              Nothing matches “{query}”. Try a meeting title or company name.
            </p>
          ) : (
            results.map((group) => (
              <div key={group.key} className="mb-1 last:mb-0">
                <p className="px-2.5 py-1.5 text-[11px] font-semibold text-muted">{group.label}</p>
                {group.items.map((item) => {
                  index += 1
                  const current = index
                  const Icon = group.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={current === cursor}
                      onMouseEnter={() => setCursor(current)}
                      onClick={() => go({ item, group })}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                        current === cursor ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-slate-100'
                      )}
                    >
                      <Icon size={15} className="text-muted" aria-hidden="true" />
                      <span className="flex-1 truncate">{item[group.field]}</span>
                      {current === cursor && <CornerDownLeft size={13} className="text-brand" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
