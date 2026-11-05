import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { usePagedList } from '@/hooks/usePagedList'
import { api } from '@/utils/api'
import { formatDate, formatTime } from '@/utils/format'

const EASE = [0.22, 1, 0.36, 1]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const DateBlock = ({ iso }) =>
  iso ? (
    <div className="text-center leading-none">
      <p className="text-sm font-semibold uppercase text-primary-700">{MONTHS[Number(iso.slice(5, 7)) - 1]}</p>
      <p className="mt-1 text-4xl font-semibold text-slate-900">{Number(iso.slice(8, 10))}</p>
    </div>
  ) : (
    <p className="text-sm font-medium text-slate-500">Date to be announced</p>
  )

const seatsLine = (event) => {
  if (event.has_started) return null
  if (event.spots_left === 0) return 'Fully booked'
  if (event.spots_left !== null && event.spots_left <= 10) return `${event.spots_left} seats left`
  return null
}

const EventCard = ({ event, index }) => {
  const seats = seatsLine(event)
  return (
    <motion.article initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: (index % 9) * 0.06 }}>
      <Link to={`/events/${event.id}`} className="group block rounded-lg focus-visible:ring-offset-4">
        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {event.poster ? (
            <img src={event.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]" />
          ) : (
            <DateBlock iso={event.starts_at} />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
        </div>
        <div className="pt-4">
          {event.starts_at && (
            <p className="text-sm font-medium text-primary-700">{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</p>
          )}
          <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors duration-300 group-hover:text-primary-700">
            {event.name}
          </h2>
          {event.location && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.location}</span>
            </p>
          )}
          {seats && <p className="mt-2 text-sm font-medium text-[#c7463a]">{seats}</p>}
        </div>
      </Link>
    </motion.article>
  )
}

const Events = () => {
  const [params] = useSearchParams()
  const when = params.get('when') === 'past' ? 'past' : 'upcoming'

  const fetchPage = useCallback(
    (page) => api.getEvents(new URLSearchParams({ when, page: String(page) }).toString()),
    [when]
  )
  const { items, loading, error, hasNext, sentinelRef, retry } = usePagedList(fetchPage)

  return (
    <div className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white" />
      </div>

      <section className="relative pt-14 pb-10 lg:pt-20 lg:pb-12">
        <Container className="text-center">
          <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
            <ol className="flex items-center justify-center gap-1.5 text-sm">
              <li><Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link></li>
              <li aria-hidden="true" className="text-slate-500">/</li>
              <li aria-current="page" className="text-slate-800">Events</li>
            </ol>
          </motion.nav>
          <motion.h1 {...fadeUp(0.08)} className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl">Events</motion.h1>
          <motion.div {...fadeUp(0.14)} className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {[['/events', 'Upcoming', 'upcoming'], ['/events?when=past', 'Past', 'past']].map(([to, label, key]) => (
              <Link
                key={key}
                to={to}
                aria-current={when === key ? 'true' : undefined}
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${when === key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="relative pb-24 lg:pb-32">
        <Container>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
            {loading && items.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} aria-hidden="true">
                <div className="aspect-[16/10] animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>

          {!loading && !error && items.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-slate-800">{when === 'past' ? 'No past events yet' : 'No upcoming events right now'}</p>
              <p className="mt-2 text-slate-500">{when === 'past' ? 'Events we have held will be listed here.' : 'New events are announced here. Check back soon.'}</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center">
              <p className="text-slate-600">Events could not be loaded.</p>
              <button type="button" onClick={retry} className="mt-4 rounded-md border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
                Try again
              </button>
            </div>
          )}

          {hasNext && !error && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
        </Container>
      </section>
    </div>
  )
}

export { Events }
