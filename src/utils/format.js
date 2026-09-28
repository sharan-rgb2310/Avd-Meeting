export const pad = (n) => String(n).padStart(2, '0')

export const toDateKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export const todayKey = () => toDateKey(new Date())

export const addDays = (days, base = new Date()) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatShortDate = (value) => {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${suffix}`
}

export const formatDateTime = (date, time) => `${formatDate(date)}${time ? ` · ${formatTime(time)}` : ''}`

export const relativeDay = (value) => {
  if (!value) return '—'
  const t = todayKey()
  if (value === t) return 'Today'
  if (value === addDays(1)) return 'Tomorrow'
  if (value === addDays(-1)) return 'Yesterday'
  return formatShortDate(value)
}

export const timeAgo = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return '—'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatShortDate(toDateKey(new Date(iso)))
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export const fileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1 }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const sortBy = (list, key, dir = 'asc') =>
  [...list].sort((a, b) => {
    const av = a?.[key] ?? ''
    const bv = b?.[key] ?? ''
    if (av === bv) return 0
    return (av > bv ? 1 : -1) * (dir === 'asc' ? 1 : -1)
  })
