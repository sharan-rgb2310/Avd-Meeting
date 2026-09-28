import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  CheckCheck,
  CheckSquare,
  FileText,
  Mail,
  MessageSquare,
  Monitor,
  Smartphone,
  Zap,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import Card, { CardHeader } from '../components/ui/Card'
import Switch from '../components/ui/Switch'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Tabs from '../components/ui/Tabs'
import useStore from '../hooks/useStore'
import useLoading from '../hooks/useLoading'
import { useToast } from '../context/ToastContext'
import { KEYS, getData } from '../services/storageService'
import {
  getSettings,
  markAllRead,
  markRead,
  saveSection,
  saveSettings,
} from '../services/notificationsService'
import { timeAgo } from '../utils/format'

const NOTIFICATION_FIELDS = [
  { key: 'emailNotifications', label: 'Email notifications', description: 'Receive activity summaries and alerts by email.' },
  { key: 'meetingReminders', label: 'Meeting reminders', description: 'Get a reminder shortly before each scheduled meeting.' },
  { key: 'actionItemReminders', label: 'Action item reminders', description: 'Be reminded on the morning an action item is due.' },
  { key: 'documentNotifications', label: 'Document notifications', description: 'Notify me when a document is added to one of my meetings.' },
  { key: 'mentionNotifications', label: 'Mention notifications', description: 'Notify me when someone mentions me in notes or comments.' },
  { key: 'pushNotifications', label: 'Push notifications', description: 'Send alerts to the devices where push is enabled.' },
  { key: 'inAppNotifications', label: 'In-app notifications', description: 'Show notifications in the header notification center.' },
]

const CHANNELS = [
  { key: 'desktopPush', label: 'Desktop push', description: 'Browser notifications on this workstation.', icon: Monitor },
  { key: 'mobilePush', label: 'Mobile push', description: 'Alerts on the AV DYNAMICS mobile app.', icon: Smartphone },
  { key: 'slack', label: 'Chat channel', description: 'Post meeting summaries into a shared team channel.', icon: MessageSquare },
]

const ICON_FOR = {
  meeting: CalendarClock,
  action: CheckSquare,
  document: FileText,
  mention: MessageSquare,
  system: Bell,
}

const SettingRow = ({ children, last = false }) => (
  <div className={`px-5 py-3.5 ${last ? '' : 'border-b border-line'}`}>{children}</div>
)

const Notifications = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const loading = useLoading(320)
  const [tab, setTab] = useState('inbox')

  const [settings] = useStore(() => getSettings())
  const [items] = useStore(() => getData(KEYS.notifications, []))

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items])
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items]
  )

  const toggle = (section, key) => (value) => {
    saveSection(section, { [key]: value })
    toast('Settings saved.')
  }

  const toggleTemplate = (id) => (value) => {
    saveSettings({
      templates: settings.templates.map((t) => (t.id === id ? { ...t, enabled: value } : t)),
    })
    toast('Settings saved.')
  }

  const openNotification = (n) => {
    markRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Manage how and when AV DYNAMICS notifies you."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              icon={CheckCheck}
              onClick={() => {
                markAllRead()
                toast('All notifications marked as read.')
              }}
            >
              Mark all as read
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'inbox', label: 'Inbox', count: unread },
          { value: 'settings', label: 'Preferences' },
          { value: 'templates', label: 'Templates' },
        ]}
      />

      {loading ? (
        <LoadingSkeleton variant="page" />
      ) : tab === 'inbox' ? (
        <Card>
          <CardHeader
            title="Recent notifications"
            description={unread ? `${unread} unread` : 'You are all caught up'}
          />
          {sorted.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="Meeting reminders, action item alerts and mentions will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((n) => {
                const Icon = ICON_FOR[n.type] || Bell
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                        n.read ? '' : 'bg-brand-50/40'
                      }`}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-ink truncate">{n.title}</span>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                        </span>
                        {n.message && <span className="mt-0.5 block text-xs text-muted">{n.message}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : tab === 'settings' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="User notification settings" description="Choose what you want to be told about." />
            <div>
              {NOTIFICATION_FIELDS.map((field, i) => (
                <SettingRow key={field.key} last={i === NOTIFICATION_FIELDS.length - 1}>
                  <Switch
                    id={`ntf-${field.key}`}
                    label={field.label}
                    description={field.description}
                    checked={Boolean(settings.notifications[field.key])}
                    onChange={toggle('notifications', field.key)}
                  />
                </SettingRow>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Automation" description="Messages AV DYNAMICS sends on your behalf." />
              <SettingRow>
                <Switch
                  id="auto-invite"
                  label="Automatic invitation email"
                  description="Send an invitation email automatically when a new user is created."
                  checked={Boolean(settings.automation.autoInviteEmail)}
                  onChange={toggle('automation', 'autoInviteEmail')}
                />
              </SettingRow>
              <SettingRow>
                <Switch
                  id="auto-digest"
                  label="Weekly digest"
                  description="A Monday morning summary of meetings and open action items."
                  checked={Boolean(settings.automation.weeklyDigest)}
                  onChange={toggle('automation', 'weeklyDigest')}
                />
              </SettingRow>
              <SettingRow last>
                <Input
                  label="Email sender"
                  icon={Mail}
                  value={settings.automation.emailSender}
                  onChange={(e) => saveSection('automation', { emailSender: e.target.value })}
                  hint="Shown as the From address on outbound notifications."
                />
              </SettingRow>
            </Card>

            <Card>
              <CardHeader title="Other channels" description="Where push notifications are delivered." />
              {CHANNELS.map((c, i) => (
                <SettingRow key={c.key} last={i === CHANNELS.length - 1}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <c.icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Switch
                        id={`ch-${c.key}`}
                        label={c.label}
                        description={c.description}
                        checked={Boolean(settings.channels[c.key])}
                        onChange={toggle('channels', c.key)}
                      />
                    </div>
                  </div>
                </SettingRow>
              ))}
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader
            title="System notification templates"
            description="Enable or disable the transactional messages the workspace sends."
            action={<Badge tone="cyan" icon={Zap}>{settings.templates.filter((t) => t.enabled).length} active</Badge>}
          />
          <div>
            {settings.templates.map((tpl, i) => (
              <SettingRow key={tpl.id} last={i === settings.templates.length - 1}>
                <Switch
                  id={`tpl-${tpl.id}`}
                  label={tpl.name}
                  description={tpl.description}
                  checked={Boolean(tpl.enabled)}
                  onChange={toggleTemplate(tpl.id)}
                />
              </SettingRow>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Notifications
