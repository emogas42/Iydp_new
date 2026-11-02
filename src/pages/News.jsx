import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Search, X, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'

const EASE = [0.22, 1, 0.36, 1]

const toPlainText = (html) => {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

const NewsCard = ({ item, index }) => {
  const [loaded, setLoaded] = useState(false)
  const excerpt = toPlainText(item.content)

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.6, ease: EASE, delay: (index % 9) * 0.06 }}
    >
      <Link to={`/news/${item.id}`} className="group block focus-visible:ring-offset-4 rounded-xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
          {item.cover_image ? (
            <>
              {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200/70" />}
              <img
                src={item.cover_image}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-smooth group-hover:scale-[1.04] ${
                  loaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 text-primary-300">
              <ImageOff className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
        </div>

        <div className="pt-5">
          <h2 className="text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors duration-300 group-hover:text-primary-600">
            {item.title}
          </h2>
          <time dateTime={item.created_at} className="mt-1.5 block text-sm text-slate-500">
            {formatDate(item.created_at)}
          </time>
          {excerpt && (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600 line-clamp-3">{excerpt}</p>
          )}
        </div>
      </Link>
    </motion.article>
  )
}

const CardSkeleton = () => (
  <div aria-hidden="true">
    <div className="aspect-[16/10] rounded-xl bg-slate-100 animate-pulse" />
    <div className="pt-5 space-y-2.5">
      <div className="h-5 w-4/5 rounded-md bg-slate-100 animate-pulse" />
      <div className="h-4 w-24 rounded-md bg-slate-100 animate-pulse" />
      <div className="h-4 w-full rounded-md bg-slate-100 animate-pulse" />
      <div className="h-4 w-2/3 rounded-md bg-slate-100 animate-pulse" />
    </div>
  </div>
)

const News = () => {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loadedQuery, setLoadedQuery] = useState(null)
  const requestId = useRef(0)

  // Debounce the search box so we query the server once typing settles.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback((pageToLoad, q) => {
    const id = ++requestId.current
    setLoading(true)
    setError(false)

    const params = new URLSearchParams({ page: String(pageToLoad) })
    if (q) params.set('search', q)

    api.getNews(params.toString())
      .then((data) => {
        if (id !== requestId.current) return
        setItems((prev) => (pageToLoad === 1 ? data.items || [] : [...prev, ...(data.items || [])]))
        setHasNext(Boolean(data.has_next))
        setPage(pageToLoad)
        setLoadedQuery(q)
      })
      .catch(() => {
        if (id === requestId.current) setError(true)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    load(1, query)
  }, [query, load])

  const { ref: sentinelRef, inView } = useInView({ rootMargin: '600px 0px' })

  useEffect(() => {
    // Only paginate once the current query's first page has landed, so a fresh
    // search is never overtaken by a stale "next page" request.
    if (inView && hasNext && !loading && !error && items.length > 0 && loadedQuery === query) {
      load(page + 1, query)
    }
  }, [inView, hasNext, loading, error, items.length, page, query, loadedQuery, load])

  const initialLoading = loading && page === 1 && items.length === 0
  const isEmpty = !loading && !error && items.length === 0

  return (
    <div className="relative min-h-screen overflow-hidden pt-[72px]">
      {/* Soft brand-tinted backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px]">
        <motion.div
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/60 blur-3xl"
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute top-24 -left-40 h-[380px] w-[380px] rounded-full bg-secondary-100/40 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white" />
      </div>

      <section className="relative pt-14 pb-10 lg:pt-20 lg:pb-14">
        <Container className="text-center">
          <motion.nav
            aria-label="Breadcrumb"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <ol className="flex items-center justify-center gap-1.5 text-sm">
              <li>
                <Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-400">/</li>
              <li aria-current="page" className="text-slate-800">News</li>
            </ol>
          </motion.nav>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
            className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl"
          >
            News
          </motion.h1>
        </Container>
      </section>

      <section className="relative pb-24 lg:pb-32">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.16 }}
            className="relative"
          >
            <label htmlFor="news-search" className="sr-only">Search news</label>
            <Search className="pointer-events-none absolute left-6 z-10 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="news-search"
              type="search"
              placeholder="Enter a keyword"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/90 py-5 pl-14 pr-14 text-base text-slate-800 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur placeholder:text-slate-400 transition focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100 [&::-webkit-search-cancel-button]:hidden"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mt-14 lg:mt-16">
            {initialLoading ? (
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : (
              <motion.div layout className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {items.map((item, i) => (
                    <NewsCard key={item.id} item={item} index={i} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-24 text-center"
              >
                <p className="text-lg font-medium text-slate-800">
                  {query ? `No results for “${query}”` : 'No news yet'}
                </p>
                <p className="mt-2 text-slate-500">
                  {query ? 'Try a different keyword.' : 'Check back soon for updates.'}
                </p>
              </motion.div>
            )}

            {error && (
              <div className="py-16 text-center">
                <p className="text-slate-600">News could not be loaded.</p>
                <button
                  type="button"
                  onClick={() => load(items.length ? page + 1 : 1, query)}
                  className="mt-4 rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Infinite-scroll trigger */}
            {hasNext && !error && items.length > 0 && (
              <div ref={sentinelRef} className="flex justify-center pt-16" aria-live="polite">
                {loading && (
                  <div className="flex items-center gap-1.5" role="status" aria-label="Loading more news">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-2 w-2 rounded-full bg-primary-500"
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  )
}

export { News }
