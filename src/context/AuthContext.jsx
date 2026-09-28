import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { KEYS, getData } from '../services/storageService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [authSession, setAuthSession] = useState(() => authService.getCurrentSession())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setAuthSession(authService.getCurrentSession())
    setReady(true)
  }, [])

  const refresh = useCallback(() => setAuthSession(authService.getCurrentSession()), [])

  useEffect(() => {
    const handler = (e) => {
      if (!e.detail || e.detail.key === KEYS.users || e.detail.key === KEYS.auth) refresh()
    }
    window.addEventListener('avdynamics:store', handler)
    return () => window.removeEventListener('avdynamics:store', handler)
  }, [refresh])

  const login = useCallback((credentials) => {
    const result = authService.login(credentials)
    if (result.ok) setAuthSession(result.session)
    return result
  }, [])

  const signup = useCallback((details) => {
    const result = authService.signUp(details)
    if (result.ok) setAuthSession(result.session)
    return result
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setAuthSession(null)
  }, [])

  const user = useMemo(() => {
    if (!authSession) return null
    return getData(KEYS.users, []).find((u) => u.id === authSession.userId) || null
  }, [authSession])

  const value = useMemo(
    () => ({ session: authSession, user, isAuthenticated: Boolean(authSession && user), ready, login, signup, logout, refresh }),
    [authSession, user, ready, login, signup, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export default AuthContext
