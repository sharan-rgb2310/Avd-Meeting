import { useCallback, useEffect, useState } from 'react'

/**
 * Subscribes a component to a LocalStorage-backed collection.
 * The storage service broadcasts `avdynamics:store` on every write, so
 * any component reading the same key re-renders immediately.
 */
export const useStore = (reader, deps = []) => {
  const read = useCallback(reader, deps) // eslint-disable-line react-hooks/exhaustive-deps
  const [value, setValue] = useState(read)

  useEffect(() => {
    const refresh = () => setValue(read())
    refresh()
    window.addEventListener('avdynamics:store', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('avdynamics:store', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [read])

  return [value, () => setValue(read())]
}

export default useStore
