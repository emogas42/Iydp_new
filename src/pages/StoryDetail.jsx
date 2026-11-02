import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Images } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Gallery } from '@/components/gallery/Gallery'
import { StoryCard, Avatar } from '@/components/stories/StoryCard'
import { api } from '@/utils/api'

const EASE = [0.22, 1, 0.36, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease: EASE, delay },
})

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

const toParagraphs = (text) =>
  (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

const readingMinutes = (text) => Math.max(1, Math.round((text || '').split(/\s+/).length / 200))

const DetailSkeleton = () => (
  <div className="min-h-screen pt-[72px]" aria-busy="true">
    <Container className="pt-14 lg:pt-20">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-40 animate-pulse rounded-full bg-slate-100" />
        <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-12 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="flex items-center gap-4 pt-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-slate-100" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-3 pt-10">
          {[100, 96, 98, 70].map((w, i) => (
            <div key={i} style={{ width: `${w}%` }} className="h-4 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </Container>
  </div>
)

const StoryDetail = () => {
  const { slug } = useParams()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getStory(slug)
      .then((data) => { if (!cancelled) setStory(data) })
      .catch(() => { if (!cancelled) setStory(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  if (loading) return <DetailSkeleton />

  if (!story) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center pt-[72px] text-center">
        <p className="text-lg font-medium text-slate-800">This story could not be found.</p>
        <Link to="/stories" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> All stories
        </Link>
      </div>
    )
  }

  const [lead, ...rest] = toParagraphs(story.content)
  const photos = story.photos || []

  return (
    <article className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[620px]">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[1000px] -translate-x-1/2 rounded-full bg-secondary-100/45 blur-3xl" />
        <div className="absolute -right-32 top-40 h-[320px] w-[320px] rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* Header */}
      <header className="relative pt-12 pb-12 lg:pt-16 lg:pb-14">
        <Container>
          <div className="mx-auto max-w-3xl">
            <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                <li><Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link></li>
                <li aria-hidden="true" className="text-slate-400">/</li>
                <li><Link to="/stories" className="text-slate-500 transition-colors hover:text-primary-600">Stories</Link></li>
              </ol>
            </motion.nav>

            {story.program && (
              <motion.span
                {...fadeUp(0.06)}
                className="mt-6 inline-flex items-center rounded-full bg-secondary-50 px-3.5 py-1 text-sm font-medium text-secondary-600 ring-1 ring-inset ring-secondary-100"
              >
                {story.program}
              </motion.span>
            )}

            <motion.h1
              {...fadeUp(0.1)}
              className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[46px] lg:leading-[1.12]"
            >
              {story.title}
            </motion.h1>

            <motion.div {...fadeUp(0.18)} className="mt-8 flex items-center gap-4">
              <Avatar src={story.avatar} name={story.author_name} className="h-14 w-14 text-base shadow-md" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">{story.author_name}</p>
                {story.author_info && <p className="text-sm text-slate-500">{story.author_info}</p>}
              </div>
            </motion.div>

            <motion.div
              {...fadeUp(0.24)}
              className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-200/80 py-4 text-sm text-slate-500"
            >
              <time dateTime={story.created_at}>{formatDate(story.created_at)}</time>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{readingMinutes(story.content)} min read</span>
              {photos.length > 0 && (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
                  <a href="#photos" className="inline-flex items-center gap-1.5 transition-colors hover:text-primary-600">
                    <Images className="h-4 w-4" />
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </a>
                </>
              )}
            </motion.div>
          </div>
        </Container>
      </header>

      {/* Body */}
      <section className="relative pb-6">
        <Container>
          <motion.div {...fadeUp(0.3)} className="mx-auto max-w-3xl">
            {lead && (
              <p className="whitespace-pre-line border-l-2 border-primary-500 pl-6 text-xl leading-relaxed text-slate-800 sm:text-[22px] sm:leading-[1.65]">
                {lead}
              </p>
            )}
            <div className="mt-10 space-y-6 text-[17px] leading-[1.8] text-slate-700">
              {rest.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Photos */}
      {photos.length > 0 && (
        <section id="photos" className="relative scroll-mt-24 pt-14 pb-6 lg:pt-16">
          <Container>
            <div className="mx-auto max-w-3xl">
              <motion.div {...inView(0)} className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-600">From the project</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Photos</h2>
                </div>
              </motion.div>
              <motion.div {...inView(0.08)}>
                <Gallery images={photos} />
              </motion.div>
            </div>
          </Container>
        </section>
      )}

      {/* Sign-off */}
      <section className="relative py-14 lg:py-16">
        <Container>
          <motion.div
            {...inView(0)}
            className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 rounded-2xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-100 sm:flex-row sm:items-center sm:p-8"
          >
            <div className="flex items-center gap-4">
              <Avatar src={story.avatar} name={story.author_name} className="h-12 w-12 text-sm" />
              <div>
                <p className="text-sm text-slate-500">Story by</p>
                <p className="font-semibold text-slate-900">{story.author_name}</p>
              </div>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,174,246,0.7)] transition-all hover:-translate-y-0.5 hover:bg-primary-600"
            >
              Find your own project
            </Link>
          </motion.div>
        </Container>
      </section>

      {/* More stories */}
      {story.related?.length > 0 && (
        <section className="relative border-t border-slate-100 bg-slate-50/60 py-16 lg:py-20">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">More stories</h2>
              <Link
                to="/stories"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
              >
                All stories
                <ArrowLeft className="h-4 w-4 rotate-180 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {story.related.map((s, i) => (
                <StoryCard key={s.id} story={s} index={i} animateOnView />
              ))}
            </div>
          </Container>
        </section>
      )}
    </article>
  )
}

export { StoryDetail }
