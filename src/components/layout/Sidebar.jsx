import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronUp, LogOut, User as UserIcon } from 'lucide-react'
import Logo from '../common/Logo'
import Avatar from '../ui/Avatar'
import Dropdown, { DropdownDivider, DropdownItem } from '../ui/Dropdown'
import { NAV_ITEMS } from './navItems'
import { cx } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export const NavList = ({ onNavigate }) => (
  <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cx(
            'group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors',
            isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden="true" />}
            <Icon size={17} className={isActive ? 'text-accent' : ''} aria-hidden="true" />
            {label}
          </>
        )}
      </NavLink>
    ))}
  </nav>
)

export const SidebarFooter = ({ onNavigate }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="border-t border-white/10 p-3">
      <Dropdown
        align="left"
        panelClassName="bottom-full mb-2 w-[210px]"
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-white/5"
          >
            <Avatar name={user.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-white">{user.name}</span>
              <span className="block text-[11px] text-slate-400">{user.role}</span>
            </span>
            <ChevronUp size={14} className="text-slate-400" aria-hidden="true" />
          </button>
        )}
      >
        {({ close }) => (
          <>
            <DropdownItem
              icon={UserIcon}
              onClick={() => {
                close()
                onNavigate?.()
                navigate('/profile')
              }}
            >
              View profile
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              icon={LogOut}
              tone="danger"
              onClick={() => {
                close()
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Sign out
            </DropdownItem>
          </>
        )}
      </Dropdown>
    </div>
  )
}

const Sidebar = () => (
  <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[240px] flex-col bg-navy">
    <div className="flex h-16 items-center border-b border-white/10 px-5">
      <Logo size="md" tone="light" variant="workspace" />
    </div>
    <NavList />
    <SidebarFooter />
  </aside>
)

export default Sidebar
