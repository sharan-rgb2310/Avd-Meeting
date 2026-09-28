import { useEffect, useMemo, useState } from 'react'

export const usePagination = (items, pageSize = 8) => {
  const [page, setPage] = useState(1)
  const total = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > total) setPage(1)
  }, [page, total])

  const slice = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  )

  return { page, setPage, totalPages: total, slice, pageSize, count: items.length }
}

export default usePagination
