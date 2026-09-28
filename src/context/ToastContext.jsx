import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ToastStack from '../components/ui/Toast'
import { uid } from '../utils/format'

const ToastContext = createContext({ toast: () => {} })

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([])

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
