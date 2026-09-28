import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { KEYS, getData } from '../services/storageService'
import { loadWorkspaceForUser } from '../services/supabaseWorkspaceService'
import { supabase } from '../utils/supabase'
import useStore from '../hooks/useStore'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [authSession, setAuthSession] = useState(() => supabase ? null : authService.getCurrentSession())
  const [ready, setReady] = useState(false)
  const [users] = useStore(() => getData(KEYS.users, []))

  const applySession = useCallback(async (nextSession) => {
    if (!nextSession) {
      setAuthSession(null)
      setReady(true)
      return true
    }

    setReady(false)
    try {
      await loadWorkspaceForUser(nextSession.user)
      setAuthSession(nextSession)
      return true
    } catch (error) {
      console.warn('Supabase workspace could not be loaded:', error.message)
      window.dispatchEvent(new CustomEvent('avdynamics:sync-error', { detail: { message: error.message } }))
      setAuthSession(null)
      return false
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setAuthSession(authService.getCurrentSession())
      setReady(true)
      return undefined
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        if (active) applySession(null)
      } else if (event === 'SIGNED_IN') {
        Promise.resolve().then(() => active && applySession(nextSession))
      }
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (active) return applySession(data.session)
      })
      .catch((error) => {
        console.warn('Supabase session could not be restored:', error.message)
        if (active) setReady(true)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const refresh = useCallback(() => {
    if (!supabase) setAuthSession(authService.getCurrentSession())
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (!e.detail || e.detail.key === KEYS.users || e.detail.key === KEYS.auth) refresh()
    }
    window.addEventListener('avdynamics:store', handler)
    return () => window.removeEventListener('avdynamics:store', handler)
  }, [refresh])

  const login = useCallback((credentials) => {
    return authService.login(credentials).then(async (result) => {
      if (!result.ok) return result
      if (supabase) {
        const restored = await applySession(result.session)
        if (!restored) return { ok: false, error: 'Signed in, but your cloud workspace could not be loaded.' }
      } else {
        setAuthSession(result.session)
      }
      return result
    })
  }, [applySession])

  const signup = useCallback((details) => {
    return authService.signUp(details).then(async (result) => {
      if (!result.ok) return result
      if (supabase) {
        const restored = await applySession(result.session)
        if (!restored) return { ok: false, error: 'Account created, but your cloud workspace could not be loaded.' }
      } else {
        setAuthSession(result.session)
      }
      return result
    })
  }, [applySession])

  const logout = useCallback(() => {
    setAuthSession(null)
    return authService.logout()
  }, [])

  const user = useMemo(() => {
    if (!authSession) return null
    const userId = supabase ? authSession.user?.id : authSession.userId
    return users.find((u) => u.id === userId) || null
  }, [authSession, users])

  const value = useMemo(
    () => ({ session: authSession, user, isAuthenticated: Boolean(authSession && (supabase || user)), ready, login, signup, logout, refresh }),
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
