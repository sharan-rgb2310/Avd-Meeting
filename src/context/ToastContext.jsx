import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ToastStack from '../components/ui/Toast'
import { uid } from '../utils/format'

const ToastContext = createContext({ toast: () => {} })

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const lastSyncErrorAt = useRef(0)

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, variant = 'success') => {
      const id = uid('toast')
      setItems((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), 3600)
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    const onSyncError = (event) => {
      if (Date.now() - lastSyncErrorAt.current < 5000) return
      lastSyncErrorAt.current = Date.now()
      toast(`Cloud save failed: ${event.detail?.message || 'Please try again.'}`, 'error')
    }
    window.addEventListener('avdynamics:sync-error', onSyncError)
    return () => window.removeEventListener('avdynamics:sync-error', onSyncError)
  }, [toast])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
export default ToastContext
