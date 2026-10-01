import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'

const newsWords = [
  { text: 'happenings', color: '#00aef6' },
  { text: 'global events', color: '#f06e60' },
  { text: 'announcements', color: '#7dba4e' },
]

const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '')

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

const News = () => {
  const [newsItems, setNewsItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    api.getNews()
      .then((data) => setNewsItems(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % newsWords.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(
    () =>
      newsItems.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      ),
    [search, newsItems]
  )

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0)
    }
  }, [filtered.length, activeIndex])

  useEffect(() => {
    if (filtered.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % filtered.length)
    }, 4500)

    return () => clearInterval(timer)
  }, [filtered.length])

  const currentWord = newsWords[wordIndex]
  const activeNews = filtered[activeIndex]

  return (
    <div className="min-h-screen pt-[72px]">
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <Container className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-primary-500 text-sm font-semibold mb-3 uppercase tracking-wider">News & Updates</p>
            <h1 className="text-3xl flex items-center justify-center flex-wrap lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              Stay informed with the latest&nbsp;
              <span
                className="inline-flex min-w-[12ch] justify-center font-black text-white rounded-full px-4 py-1 transition-all duration-500"
                style={{ backgroundColor: currentWord.color }}
              >
                {currentWord.text}
              </span>
              &nbsp;from the platform.
            </h1>
            <p className="text-slate-500 max-w-xl mx-auto">
              Explore updates, results, and announcements from our projects and community.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="relative mb-10 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
            />
          </div>

          {loading && (
            <div className="text-center py-20">
              <p className="text-slate-400">Loading...</p>
            </div>
          )}

          {!loading && activeNews && (
            <div className="grid lg:grid-cols-[1fr_1.25fr] gap-7 items-stretch">
              <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {filtered.map((item, i) => {
                  const isActive = i === activeIndex
                  const thumbHeight = i % 3 === 0 ? 'h-20' : i % 3 === 1 ? 'h-16' : 'h-24'

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveIndex(i)}
                      className={`group shrink-0 w-72 lg:w-full rounded-2xl border transition-all p-3 text-left ${
                        isActive
                          ? 'bg-white border-primary-200 shadow-md'
                          : 'bg-white/70 border-slate-200 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.cover_image ? (
                          <img
                            src={item.cover_image}
                            alt={item.title}
                            className={`w-24 ${thumbHeight} rounded-xl object-cover`}
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-24 ${thumbHeight} rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 text-xl shrink-0`}>
                            📰
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider mb-1">
                            {formatDate(item.created_at)}
                          </p>
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.article
                  key={activeNews.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl flex flex-col"
                >
                  <div className="relative h-56 md:h-64 lg:h-72 overflow-hidden bg-slate-100">
                    {activeNews.cover_image && (
                      <img
                        src={activeNews.cover_image}
                        alt={activeNews.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                  </div>

                  <div className="p-6 lg:p-7 flex-1 flex flex-col">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                      <Calendar className="w-3 h-3" />
                      {formatDate(activeNews.created_at)}
                    </span>
                    <h3 className="font-bold text-slate-900 mb-3 text-xl lg:text-2xl">
                      {activeNews.title}
                    </h3>
                    <p className="text-slate-500 leading-relaxed mb-6 flex-1 line-clamp-4">
                      {stripHtml(activeNews.content)}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <Link
                        to={`/news/${activeNews.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition"
                      >
                        Read full update <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      {filtered.length > 1 && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
                            }
                            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setActiveIndex((prev) => (prev + 1) % filtered.length)
                            }
                            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No news found.</p>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}

export { News }
