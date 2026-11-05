import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, Calendar, ImageOff, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'
import { formatDate } from '@/utils/format'

const EASE = [0.22, 1, 0.36, 1]

const toPlainText = (html) => {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

// News has no category field: keyword_image is the name of its photo folder.
const labelOf = (item) =>
  (item.keyword_image || '').trim().replace(/[_-]+/g, ' ') || 'Announcement'

const Photo = ({ src, iconClass }) =>
  src ? (
    <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 text-primary-300">
      <ImageOff className={iconClass} strokeWidth={1.5} />
    </div>
  )

const NewsListItem = ({ item, active, onSelect }) => {
  const handleClick = (e) => {
    // Desktop previews beside the list. On phones the preview is out of view, so
    // the row opens the article, and so does ctrl/cmd-click everywhere.
    if (e.metaKey || e.ctrlKey || e.shiftKey || !window.matchMedia('(min-width: 1024px)').matches) return
    e.preventDefault()
    onSelect(item.id)
  }

  return (
    <Link
      to={`/news/${item.id}`}
      onClick={handleClick}
      aria-current={active ? 'true' : undefined}
      className={`group items-center gap-3.5 rounded-3xl border bg-white p-3 transition-[border-color,box-shadow] duration-300 ${
        active
          ? 'hidden border-primary-300 shadow-[0_10px_30px_-14px_rgba(0,174,246,0.55)] lg:flex'
          : 'flex border-slate-200 hover:border-primary-200 hover:shadow-[0_8px_24px_-16px_rgba(15,23,42,0.3)]'
      }`}
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        <Photo src={item.cover_image} iconClass="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-primary-600">{labelOf(item)}</p>
        <h2 className={`mt-1.5 text-[15px] font-semibold leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-primary-600 ${
          active ? 'text-primary-600' : 'text-slate-800'
        }`}>
          {item.title}
        </h2>
      </div>
    </Link>
  )
}

const NewsPreview = ({ item }) => {
  const excerpt = toPlainText(item.content)

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.35, ease: EASE }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)]"
    >
      <Link to={`/news/${item.id}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 lg:aspect-[16/7]">
          <div className="h-full w-full transition-transform duration-700 ease-smooth group-hover:scale-[1.03]">
            <Photo src={item.cover_image} iconClass="h-10 w-10" />
          </div>
          <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] truncate rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {labelOf(item)}
          </span>
        </div>
        <div className="p-6 lg:p-7">
          <time dateTime={item.created_at} className="flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(item.created_at)}
          </time>
          <h2 className="mt-3 text-xl font-semibold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-primary-600 lg:text-2xl">
            {item.title}
          </h2>
          {excerpt && <p className="mt-3 leading-relaxed text-slate-600 line-clamp-3">{excerpt}</p>}
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600">
            Read full article
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.article>
  )
}

const LayoutSkeleton = () => (
  <div aria-hidden="true" className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
    <div className="hidden space-y-3.5 lg:block">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[122px] animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
    <div className="h-[420px] animate-pulse rounded-3xl bg-slate-100" />
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
  const [activeId, setActiveId] = useState(null)
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
  const active = items.find((item) => item.id === activeId) || items[0]

  return (
    <div className="relative min-h-screen overflow-clip pt-[72px]">
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
              <li aria-hidden="true" className="text-slate-500">/</li>
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
            <Search className="pointer-events-none absolute left-5 z-10 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="news-search"
              type="search"
              placeholder="Search news"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-[15px] text-slate-800 placeholder:text-slate-500 transition focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100 [&::-webkit-search-cancel-button]:hidden"
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
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mt-10">
            {initialLoading && <LayoutSkeleton />}

            {items.length > 0 && (
              <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                <div className="flex flex-col gap-3.5">
                  {items.map((item) => (
                    <NewsListItem key={item.id} item={item} active={item.id === active.id} onSelect={setActiveId} />
                  ))}
                </div>
                <div className="order-first lg:order-none lg:sticky lg:top-24">
                  <AnimatePresence mode="wait">
                    <NewsPreview key={active.id} item={active} />
                  </AnimatePresence>
                </div>
              </div>
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
