import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, CheckSquare, AtSign, FileText, Info, CheckCheck } from 'lucide-react'
import Dropdown from '../ui/Dropdown'
import { KEYS, getData } from '../../services/storageService'
import { markAllRead, markRead } from '../../services/notificationsService'
import useStore from '../../hooks/useStore'
import { cx, timeAgo } from '../../utils/format'

const ICONS = {
  meeting: CalendarDays,
  action: CheckSquare,
  mention: AtSign,
  document: FileText,
  system: Info,
}

const NotificationCenter = () => {
  const [notifications] = useStore(() => getData(KEYS.notifications, []))
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length
  const recent = notifications.slice(0, 6)

  return (
    <Dropdown
      panelClassName="w-[340px] sm:w-[380px] p-0 overflow-hidden"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative rounded-[10px] p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              <p className="text-xs text-muted">{unread ? `${unread} unread` : 'You are all caught up'}</p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-700"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">No notifications yet.</p>
            ) : (
              recent.map((n) => {
                const Icon = ICONS[n.type] || Info
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead(n.id)
                      close()
                      if (n.link) navigate(n.link)
                    }}
                    className={cx(
                      'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                      !n.read && 'bg-brand-50/50'
                    )}
                  >
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-line text-brand">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted leading-snug">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />}
                  </button>
                )
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              close()
              navigate('/notifications')
            }}
            className="w-full border-t border-line bg-slate-50/60 py-2.5 text-[13px] font-medium text-brand hover:bg-slate-100"
          >
            View all notifications
          </button>
        </>
      )}
    </Dropdown>
  )
}

export default NotificationCenter
