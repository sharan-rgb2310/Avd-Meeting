import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppRoutes from './routes/AppRoutes'
import { configureRemotePersistence, initializeSeedData } from './services/storageService'
import { persistWorkspaceChange } from './services/supabaseWorkspaceService'
import { supabase } from './utils/supabase'
import seed from './data/seedData'

const App = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    configureRemotePersistence(persistWorkspaceChange)
    if (!supabase && !import.meta.env.PROD) initializeSeedData(seed)
    setReady(true)
  }, [])

  if (!ready) return null
  if (import.meta.env.PROD && !supabase) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5">
        <section role="alert" className="max-w-lg rounded-xl border border-line bg-white p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Cloud storage is not configured</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your Vercel project settings, then redeploy.
          </p>
        </section>
      </main>
    )
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
