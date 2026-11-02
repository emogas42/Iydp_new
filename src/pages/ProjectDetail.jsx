import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, ImageOff, MapPin } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { RichText } from '@/components/ui/RichText'
import { Gallery } from '@/components/gallery/Gallery'
import { Lightbox } from '@/components/gallery/Lightbox'
import { ApplicationForm } from '@/components/projects/ApplicationForm'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/utils/api'
import { formatDate, formatRange } from '@/utils/format'

const EASE = [0.22, 1, 0.36, 1]
const STATUS_LABELS = { pending: 'Under review', accepted: 'Accepted', rejected: 'Not selected' }

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

const ApplySection = ({ project, onApplied }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (project.my_application) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <p className="font-semibold text-slate-900">You applied on {formatDate(project.my_application.applied_at)}.</p>
        <p className="mt-1 text-slate-600">Status: {STATUS_LABELS[project.my_application.status] || project.my_application.status}. You can follow it on your <Link to="/account" className="font-medium text-primary-700 underline underline-offset-4">account page</Link>.</p>
      </div>
    )
  }
  if (!project.applications_open) {
    return <p className="rounded-lg border border-slate-200 bg-white p-5 text-slate-600 sm:p-7">Applications for this project are closed.</p>
  }
  if (loading) return null
  if (!user) {
    const state = { from: `${location.pathname}?apply=1` }
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <p className="font-semibold text-slate-900">Create a free account to apply</p>
        <p className="mt-1 text-slate-600">It takes a minute, and you come straight back to this form.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/register" state={state} className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 font-semibold text-white transition-colors hover:bg-primary-700">
            Create account
          </Link>
          <Link to="/login" state={state} className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            I already have an account
          </Link>
        </div>
      </div>
    )
  }
  return <ApplicationForm projectId={project.id} user={user} onSubmitted={onApplied} />
}

const ProjectDetail = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posterOpen, setPosterOpen] = useState(null)
  const loggedIn = Boolean(user)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getProject(id)
      .then((data) => { if (!cancelled) setProject(data) })
      .catch(() => { if (!cancelled) setProject(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Reloaded on login too, so an earlier application shows up.
  }, [id, loggedIn])

  const wantsToApply = searchParams.get('apply') === '1'
  useEffect(() => {
    if (!loading && project && wantsToApply) {
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, project, wantsToApply])

  if (loading && !project) {
    return (
      <div className="min-h-screen pt-[72px]" aria-busy="true">
        <Container className="pt-14 lg:pt-20">
          <div className="grid gap-10 md:grid-cols-[320px_1fr]">
            <div className="aspect-[4/5] animate-pulse rounded-lg bg-slate-100" />
            <div className="space-y-4">
              <div className="h-10 w-4/5 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </Container>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center pt-[72px] text-center">
        <p className="text-lg font-medium text-slate-800">This project could not be found.</p>
        <Link to="/projects" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>
      </div>
    )
  }

  const finished = project.phase === 'finished'
  const listUrl = finished ? '/projects/finished' : '/projects'
  const showApply = project.my_application || (!finished && project.accepts_applications)

  return (
    <article className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div className="absolute -top-48 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>

      <section className="relative pt-12 pb-12 lg:pt-16">
        <Container>
          <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li><Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link></li>
              <li aria-hidden="true" className="text-slate-400">/</li>
              <li><Link to={listUrl} className="text-slate-500 transition-colors hover:text-primary-600">{finished ? 'Finished Projects' : 'Present Projects'}</Link></li>
            </ol>
          </motion.nav>

          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
            <motion.div {...fadeUp(0.06)}>
              {project.poster ? (
                <button type="button" onClick={() => setPosterOpen(0)} aria-label="Open poster in full screen" className="block w-full max-w-[320px] overflow-hidden rounded-lg">
                  <img src={project.poster} alt={`${project.title} poster`} className="aspect-[4/5] w-full object-cover" />
                </button>
              ) : (
                <div className="flex aspect-[4/5] w-full max-w-[320px] items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                  <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                </div>
              )}
            </motion.div>

            <div>
              <motion.p {...fadeUp(0.1)} className={`text-sm font-semibold ${finished ? 'text-secondary-600' : 'text-[#4f7f2b]'}`}>
                {finished ? 'Finished project' : project.applications_open ? 'Applications open' : project.accepts_applications ? 'Applications closed' : 'Present project'}
              </motion.p>
              <motion.h1 {...fadeUp(0.12)} className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
                {project.title}
              </motion.h1>

              <motion.dl {...fadeUp(0.18)} className="mt-7 grid gap-5 sm:grid-cols-2">
                <Fact icon={MapPin} label="Location" value={project.location} />
                <Fact icon={Calendar} label="Project dates" value={formatRange(project.start_date, project.end_date)} />
                {!finished && <Fact icon={Clock} label="Application deadline" value={formatDate(project.deadline)} />}
              </motion.dl>

              {project.tags?.length > 0 && (
                <motion.p {...fadeUp(0.22)} className="mt-6 text-sm text-slate-500">{project.tags.join(' · ')}</motion.p>
              )}

              {project.applications_open && !project.my_application && (
                <motion.a {...fadeUp(0.26)} href="#apply" className="mt-7 inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-8 font-semibold text-white transition-colors hover:bg-primary-700">
                  Apply now
                </motion.a>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="relative pb-6">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">About the project</h2>
            <RichText content={project.description} />
            {project.requirements && (
              <>
                <h2 className="mb-4 mt-12 text-2xl font-semibold tracking-tight text-slate-900">Who can apply</h2>
                <RichText content={project.requirements} />
              </>
            )}
          </div>
        </Container>
      </section>

      {project.photos?.length > 0 && (
        <section aria-labelledby="photos-heading" className="relative pt-12">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 id="photos-heading" className="mb-5 text-2xl font-semibold tracking-tight text-slate-900">Photos</h2>
              <Gallery images={project.photos} />
            </div>
          </Container>
        </section>
      )}

      {showApply && (
        <section id="apply" className="relative scroll-mt-24 pt-14 pb-20 lg:pb-28">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-5 text-2xl font-semibold tracking-tight text-slate-900">Apply</h2>
              <ApplySection project={project} onApplied={(mine) => setProject((p) => ({ ...p, my_application: mine }))} />
            </div>
          </Container>
        </section>
      )}
      {!showApply && <div className="pb-20" />}

      {project.poster && (
        <Lightbox images={[project.poster]} index={posterOpen} onClose={() => setPosterOpen(null)} onIndexChange={setPosterOpen} />
      )}
    </article>
  )
}

export { ProjectDetail }
