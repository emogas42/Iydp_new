import { useEffect, useState } from 'react'
import { usePageTitle } from '@/components/layout/PageTitle'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, Hourglass, MapPin, Users, X } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { QuestionForm } from '@/components/forms/QuestionForm'
import { VerifyEmailNotice } from '@/components/account/VerifyEmailNotice'
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
      <dl>
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="font-medium text-slate-900">{value}</dd>
      </dl>
    </div>
  ) : null

const Note = ({ text }) =>
  text ? <p className="mt-3 whitespace-pre-line rounded-md bg-slate-50 p-3 text-slate-700">{text}</p> : null

const MyAnswers = ({ answers }) =>
  answers?.length > 0 ? (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-medium text-slate-600">My answers</summary>
      <dl className="mt-3 space-y-3">
        {answers.map((a) => (
          <div key={a.question_id}>
            <dt className="text-slate-500">{a.label}</dt>
            <dd className="mt-0.5 whitespace-pre-line break-words text-slate-800">{(Array.isArray(a.value) ? a.value.join(', ') : a.value) || '—'}</dd>
          </div>
        ))}
      </dl>
    </details>
  ) : null

const EventDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [event, setEvent] = useState(null)
  usePageTitle(event?.name)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const loggedIn = Boolean(user)

  useEffect(() => {
    let cancelled = false
    api.getEvent(id)
      .then((data) => { if (!cancelled) setEvent(data) })
      .catch(() => { if (!cancelled) setEvent(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, loggedIn])

  // Back from sign-up or sign-in: take them to the form they came for.
  const wantsToApply = searchParams.get('apply') === '1'
  useEffect(() => {
    if (wantsToApply && !loading && !authLoading && event) {
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [wantsToApply, loading, authLoading, event])

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

  const registration = event.registration
  const showForm = user && !registration && event.registration_open

  const withdraw = async () => {
    const question = registration.status === 'approved'
      ? 'Cancel your seat? If you change your mind you will need to apply again.'
      : 'Withdraw your application?'
    if (!window.confirm(question)) return
    setBusy(true)
    setError('')
    try {
      setEvent(await api.unregisterFromEvent(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const signUpState = { from: `${location.pathname}?apply=1` }
  const seats = event.capacity === null ? null : event.spots_left === 0 ? 'Fully booked' : `${event.spots_left} of ${event.capacity} seats left`
  const primaryButton = 'inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-8 font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto'
  const withdrawButton = (label) => (
    <button type="button" disabled={busy} onClick={withdraw} className="mt-4 block min-h-11 text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800 disabled:opacity-60">
      {label}
    </button>
  )

  let status
  if (registration?.status === 'approved') {
    status = (
      <>
        <p className="flex items-center gap-2 font-semibold text-[#4f7f2b]"><Check className="h-5 w-5" /> Your place is confirmed</p>
        <p className="mt-1 text-slate-600">Show the QR code on your <Link to="/account" className="font-medium text-primary-700 underline underline-offset-4">membership card</Link> at the entrance.</p>
        <Note text={registration.note} />
        <MyAnswers answers={registration.answers} />
        {!event.has_started && withdrawButton('Cancel my place')}
      </>
    )
  } else if (registration?.status === 'pending') {
    status = (
      <>
        <p className="flex items-center gap-2 font-semibold text-slate-900"><Hourglass className="h-5 w-5 text-primary-600" /> Your application is under review</p>
        <p className="mt-1 text-slate-600">
          Your seat is not booked yet. We will let you know on your <Link to="/account" className="font-medium text-primary-700 underline underline-offset-4">account page</Link>{event.email_notifications ? ' and by email' : ''} once the team decides.
        </p>
        <MyAnswers answers={registration.answers} />
        {!event.has_started && withdrawButton('Withdraw my application')}
      </>
    )
  } else if (registration?.status === 'rejected') {
    status = (
      <>
        <p className="flex items-center gap-2 font-semibold text-slate-900"><X className="h-5 w-5 text-[#c7463a]" /> Your application was not accepted</p>
        <p className="mt-1 text-slate-600">Thank you for your interest. We hope to see you at another event.</p>
        <Note text={registration.note} />
        <MyAnswers answers={registration.answers} />
      </>
    )
  } else if (event.has_started) {
    status = <p className="text-slate-600">This event has already taken place.</p>
  } else if (event.spots_left === 0) {
    status = <p className="font-medium text-slate-800">This event is fully booked.</p>
  } else if (!event.registration_open) {
    status = <p className="font-medium text-slate-800">Applications are not open yet.</p>
  } else if (showForm) {
    status = (
      <>
        <p className="text-slate-600">To join, fill in the short form. The team reviews each application.</p>
        <a href="#apply" className={`${primaryButton} mt-4`}>Apply</a>
      </>
    )
  } else {
    status = (
      <>
        <p className="font-semibold text-slate-900">Create a free account to apply</p>
        <p className="mt-1 text-slate-600">It takes a minute, and you come straight back to the form.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/register" state={signUpState} className={primaryButton}>Create account</Link>
          <Link to="/login" state={signUpState} className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            I already have an account
          </Link>
        </div>
      </>
    )
  }

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
                <li aria-hidden="true" className="text-slate-500">/</li>
                <li><Link to="/events" className="text-slate-500 transition-colors hover:text-primary-600">Events</Link></li>
              </ol>
            </motion.nav>

            <motion.h1 {...fadeUp(0.08)} className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {event.name}
            </motion.h1>

            <motion.div {...fadeUp(0.14)} className="mt-7 grid gap-5 sm:grid-cols-3">
              <Fact icon={Calendar} label="When" value={event.starts_at ? `${formatDate(event.starts_at)}, ${formatTime(event.starts_at)}` : 'To be announced'} />
              <Fact icon={MapPin} label="Where" value={event.location} />
              {!event.has_started && <Fact icon={Users} label="Seats" value={seats} />}
            </motion.div>

            <motion.div {...fadeUp(0.2)} className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
              {status}
              {error && <p role="alert" className="mt-3 text-sm text-[#c7463a]">{error}</p>}
            </motion.div>

            {event.poster && (
              <motion.img {...fadeUp(0.26)} src={event.poster} alt={`${event.name} poster`} className="mt-10 w-full rounded-lg" />
            )}
            {event.description && (
              <motion.div {...fadeUp(0.3)} className="mt-10"><RichText content={event.description} /></motion.div>
            )}

            {showForm && (
              <div id="apply" className="scroll-mt-24 pt-14">
                <h2 className="mb-5 text-2xl font-semibold tracking-tight text-slate-900">Application form</h2>
                {user.email_verification_required ? (
                  <VerifyEmailNotice />
                ) : (
                  <QuestionForm
                    questions={event.questions}
                    submit={(answers) => api.registerForEvent(event.id, answers)}
                    onSubmitted={setEvent}
                    note="Sending this does not book a seat. The team reviews each application and lets you know."
                  />
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </article>
  )
}

export { EventDetail }
