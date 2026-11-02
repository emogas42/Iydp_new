import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'

/**
 * Infinite-scroll list over a paged API. `fetchPage(page)` must change identity
 * when the list should restart (new search, tab, ...), so wrap it in useCallback.
 */
const usePagedList = (fetchPage) => {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const load = useCallback((pageToLoad) => {
    const id = ++requestId.current
    setLoading(true)
    setError(false)
    fetchPage(pageToLoad)
      .then((data) => {
        if (id !== requestId.current) return
        setItems((prev) => (pageToLoad === 1 ? data.items || [] : [...prev, ...(data.items || [])]))
        setHasNext(Boolean(data.has_next))
        setPage(pageToLoad)
      })
      .catch(() => {
        if (id === requestId.current) setError(true)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [fetchPage])

  useEffect(() => {
    setItems([])
    setHasNext(false)
    load(1)
  }, [load])

  const { ref: sentinelRef, inView } = useInView({ rootMargin: '600px 0px' })

  useEffect(() => {
    if (inView && hasNext && !loading && !error) load(page + 1)
  }, [inView, hasNext, loading, error, page, load])

  const retry = () => load(items.length ? page + 1 : 1)

  return { items, loading, error, hasNext, sentinelRef, retry }
}

export { usePagedList }
