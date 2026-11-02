import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, ImageOff } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Gallery } from '@/components/gallery/Gallery'
import { RichText } from '@/components/ui/RichText'
import { api } from '@/utils/api'

const EASE = [0.22, 1, 0.36, 1]

const formatDate = (iso, month = 'long') =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' }) : ''

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const DetailSkeleton = () => (
  <div className="min-h-screen pt-[72px]" aria-busy="true">
    <Container className="pt-14 lg:pt-20">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
        <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
        <div className="h-10 w-2/3 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="mx-auto mt-10 flex max-w-3xl gap-1.5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] w-[calc((100%-6px)/1.25)] shrink-0 rounded-[6px] bg-slate-100 animate-pulse sm:w-[calc((100%-6px)/1.9)] lg:w-[calc((100%-12px)/2.6)]" />
        ))}
      </div>
    </Container>
  </div>
)

const NewsDetail = () => {
  const { id } = useParams()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getNewsDetail(id)
      .then((data) => { if (!cancelled) setNews(data) })
      .catch(() => { if (!cancelled) setNews(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) return <DetailSkeleton />

  if (!news) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center pt-[72px] text-center">
        <p className="text-lg font-medium text-slate-800">This article could not be found.</p>
        <Link to="/news" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Back to News
        </Link>
      </div>
    )
  }

  const images = news.album_images?.length ? news.album_images : news.cover_image ? [news.cover_image] : []

  return (
    <article className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div className="absolute -top-48 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>

      <header className="relative pt-12 pb-10 lg:pt-16 lg:pb-12">
        <Container>
          <div className="mx-auto max-w-3xl">
            <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                <li>
                  <Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link>
                </li>
                <li aria-hidden="true" className="text-slate-400">/</li>
                <li>
                  <Link to="/news" className="text-slate-500 transition-colors hover:text-primary-600">News</Link>
                </li>
              </ol>
            </motion.nav>

            <motion.h1
              {...fadeUp(0.08)}
              className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[44px] lg:leading-[1.15]"
            >
              {news.title}
            </motion.h1>

            <motion.div {...fadeUp(0.16)} className="mt-5 flex items-center gap-4 text-sm text-slate-500">
              <time dateTime={news.created_at}>{formatDate(news.created_at)}</time>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {news.view_count} {news.view_count === 1 ? 'view' : 'views'}
              </span>
            </motion.div>
          </div>
        </Container>
      </header>

      {images.length > 0 && (
        <section aria-label="Photo gallery" className="relative">
          <Container>
            <motion.div {...fadeUp(0.22)} className="mx-auto max-w-3xl">
              <Gallery images={images} />
            </motion.div>
          </Container>
        </section>
      )}

      <section className="relative pt-10 pb-16 lg:pt-12 lg:pb-20">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto max-w-3xl"
          >
            <RichText content={news.content} />

            <div className="mt-12 border-t border-slate-200 pt-8">
              <Link
                to="/news"
                className="group inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                All news
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

      {news.related?.length > 0 && (
        <section className="relative border-t border-slate-100 bg-slate-50/60 py-16 lg:py-20">
          <Container>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">More news</h2>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {news.related.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                >
                  <Link to={`/news/${item.id}`} className="group block">
                    <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary-300">
                          <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors group-hover:text-primary-600">
                      {item.title}
                    </h3>
                    <time dateTime={item.created_at} className="mt-1.5 block text-sm text-slate-500">
                      {formatDate(item.created_at, 'short')}
                    </time>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}
    </article>
  )
}

export { NewsDetail }
