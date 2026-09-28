import {
  LayoutDashboard, Building2, CalendarDays, CheckSquare, FileText, Users, Bell, ShieldCheck,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/meetings', label: 'Meetings', icon: CalendarDays },
  { to: '/action-items', label: 'Action Items', icon: CheckSquare },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/authentication', label: 'Authentication', icon: ShieldCheck },
]

export default NAV_ITEMS
