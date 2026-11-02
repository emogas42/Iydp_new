import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, MapPin, Users } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/utils/api'
import { formatDate, formatTime } from '@/utils/format'

const EASE = [0.22, 1, 0.36, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const Fact = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" strokeWidth={1.75} />
      <div>
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  ) : null

const EventDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const autoRegistered = useRef(false)
  const loggedIn = Boolean(user)

  useEffect(() => {
    let cancelled = false
    api.getEvent(id)
      .then((data) => { if (!cancelled) setEvent(data) })
      .catch(() => { if (!cancelled) setEvent(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, loggedIn])

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      setEvent(await action(id))
    } catch (err) {
      setError(err.message)
      if (err.status === 400) api.getEvent(id).then(setEvent).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  // Back from sign-up or sign-in: finish the registration they started.
  const wantsRegistration = searchParams.get('register') === '1'
  useEffect(() => {
    if (!wantsRegistration || authLoading || loading || !user || !event || autoRegistered.current) return
    autoRegistered.current = true
    setSearchParams({}, { replace: true })
    if (!event.is_registered && event.registration_open) run(api.registerForEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsRegistration, authLoading, loading, user, event])

  if (loading) {
    return (
      <div className="min-h-screen pt-[72px]" aria-busy="true">
        <Container className="pt-14 lg:pt-20">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-10 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="aspect-[16/10] animate-pulse rounded-lg bg-slate-100" />
          </div>
        </Container>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center pt-[72px] text-center">
        <p className="text-lg font-medium text-slate-800">This event could not be found.</p>
        <Link to="/events" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>
      </div>
    )
  }

  const goToSignUp = () => navigate('/register', { state: { from: `${location.pathname}?register=1` } })
  const seats = event.capacity === null ? null : event.spots_left === 0 ? 'Fully booked' : `${event.spots_left} of ${event.capacity} seats left`
  const primaryButton = 'inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-8 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

  return (
    <article className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[480px]">
        <div className="absolute -top-48 left-1/2 h-[440px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>

      <section className="relative pt-12 pb-24 lg:pt-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                <li><Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link></li>
                <li aria-hidden="true" className="text-slate-400">/</li>
                <li><Link to="/events" className="text-slate-500 transition-colors hover:text-primary-600">Events</Link></li>
              </ol>
            </motion.nav>

            <motion.h1 {...fadeUp(0.08)} className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {event.name}
            </motion.h1>

            <motion.dl {...fadeUp(0.14)} className="mt-7 grid gap-5 sm:grid-cols-3">
              <Fact icon={Calendar} label="When" value={event.starts_at ? `${formatDate(event.starts_at)}, ${formatTime(event.starts_at)}` : 'To be announced'} />
              <Fact icon={MapPin} label="Where" value={event.location} />
              {!event.has_started && <Fact icon={Users} label="Seats" value={seats} />}
            </motion.dl>

            <motion.div {...fadeUp(0.2)} className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
              {event.is_registered ? (
                <>
                  <p className="flex items-center gap-2 font-semibold text-[#4f7f2b]"><Check className="h-5 w-5" /> You are registered</p>
                  <p className="mt-1 text-slate-600">Show the QR code on your <Link to="/account" className="font-medium text-primary-700 underline underline-offset-4">membership card</Link> at the entrance.</p>
                  {!event.has_started && (
                    <button type="button" disabled={busy} onClick={() => run(api.unregisterFromEvent)} className="mt-4 text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800 disabled:opacity-60">
                      Cancel my registration
                    </button>
                  )}
                </>
              ) : event.has_started ? (
                <p className="text-slate-600">This event has already taken place.</p>
              ) : event.spots_left === 0 ? (
                <p className="font-medium text-slate-800">This event is fully booked.</p>
              ) : user ? (
                <button type="button" disabled={busy} onClick={() => run(api.registerForEvent)} className={primaryButton}>
                  {busy ? 'Registering…' : 'Register'}
                </button>
              ) : (
                <>
                  <button type="button" disabled={authLoading} onClick={goToSignUp} className={primaryButton}>Register</button>
                  <p className="mt-3 text-sm text-slate-500">You will create a free account first, and your seat is booked right after.</p>
                </>
              )}
              {error && <p role="alert" className="mt-3 text-sm text-[#c7463a]">{error}</p>}
            </motion.div>

            {event.poster && (
              <motion.img {...fadeUp(0.26)} src={event.poster} alt={`${event.name} poster`} className="mt-10 w-full rounded-lg" />
            )}
            {event.description && (
              <motion.div {...fadeUp(0.3)} className="mt-10"><RichText content={event.description} /></motion.div>
            )}
          </div>
        </Container>
      </section>
    </article>
  )
}

export { EventDetail }
