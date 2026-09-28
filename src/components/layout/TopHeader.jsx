import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Settings, User as UserIcon } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Dropdown, { DropdownDivider, DropdownItem } from '../ui/Dropdown'
import GlobalSearch from './GlobalSearch'
import NotificationCenter from '../notifications/NotificationCenter'
import Logo from '../common/Logo'
import { useAuth } from '../../context/AuthContext'

const TopHeader = ({ onOpenMenu }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="rounded-[10px] p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink lg:hidden"
      >
        <Menu size={19} />
      </button>

      <span className="lg:hidden">
        <Logo size="sm" tone="dark" />
      </span>

      <GlobalSearch className="hidden flex-1 sm:block max-w-md" />

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationCenter />
        <Dropdown
          panelClassName="w-[210px]"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-[10px] py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
            >
              <Avatar name={user?.name || 'Guest'} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-tight text-ink">{user?.name}</span>
                <span className="block text-[11px] leading-tight text-muted">{user?.role}</span>
              </span>
              <ChevronDown size={14} className="text-muted" aria-hidden="true" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-2.5 py-2">
                <p className="text-[13px] font-medium text-ink">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <DropdownDivider />
              <DropdownItem icon={UserIcon} onClick={() => { close(); navigate('/profile') }}>
                Profile
              </DropdownItem>
              <DropdownItem icon={Settings} onClick={() => { close(); navigate('/authentication') }}>
                Workspace settings
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={LogOut} tone="danger" onClick={() => { close(); logout(); navigate('/login', { replace: true }) }}>
                Sign out
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  )
}

export default TopHeader
