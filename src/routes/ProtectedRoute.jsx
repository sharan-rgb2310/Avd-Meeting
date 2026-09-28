import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = () => {
  const { isAuthenticated, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, ready } = useAuth()
  if (!ready) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export default ProtectedRoute
