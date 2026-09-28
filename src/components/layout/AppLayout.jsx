import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileSidebar from './MobileSidebar'
import TopHeader from './TopHeader'
import GlobalSearch from './GlobalSearch'
import ErrorBoundary from '../common/ErrorBoundary'

const AppLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[240px]">
        <TopHeader onOpenMenu={() => setMenuOpen(true)} />
        <div className="px-4 pt-3 sm:hidden">
          <GlobalSearch />
        </div>
        <main className="px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
