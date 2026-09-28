import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppRoutes from './routes/AppRoutes'
import { KEYS, clearData, initializeSeedData } from './services/storageService'
import seed from './data/seedData'

const App = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const connectedMode = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    const demoCleanupKey = 'avdynamics_demo_workspace_cleared'
    let active = true
    let unsubscribe = () => { }

    if (!connectedMode) {
      initializeSeedData(seed)
    } else if (!window.localStorage.getItem(demoCleanupKey)) {
      ;[
        KEYS.companies,
        KEYS.teams,
        KEYS.meetings,
        KEYS.remoteMeetingIds,
        KEYS.actionItems,
        KEYS.documents,
        KEYS.notifications,
        KEYS.activity,
      ].forEach(clearData)
      window.localStorage.setItem(demoCleanupKey, '1')
    }

    if (connectedMode) {
      import('./services/supabaseRealtimeService')
        .then(({ subscribeToRemoteMeetings }) => {
          if (active) unsubscribe = subscribeToRemoteMeetings()
        })
        .catch((error) => console.warn('Supabase realtime could not start:', error.message))
    }
    setReady(true)

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (!ready) return null

  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
