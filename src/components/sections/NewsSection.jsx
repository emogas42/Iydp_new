import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { newsItems } from '@/data'

const accentColors = ['#00aef6', '#f06e60', '#7dba4e', '#6f3d90']
const SWIPE_THRESHOLD = 70

const NewsSection = () => {
  const [active, setActive] = useState(0)
  const goPrev = () => setActive((prev) => (prev - 1 + newsItems.length) % newsItems.length)
  const goNext = () => setActive((prev) => (prev + 1) % newsItems.length)

  useEffect(() => {
    if (newsItems.length <= 1) return

    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % newsItems.length)
    }, 4800)

    return () => clearInterval(timer)
  }, [])

  const featured = newsItems[active]
  const sideItems = newsItems.filter((_, i) => i !== active).slice(0, 3)
  const color = accentColors[active % accentColors.length]

  return (
    <section id="news" className="section-padding bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeader
          badge="News & Updates"
          badgeColor="primary"
          title="Latest from"
          highlightedText="IYDP"
          center
        />

        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-6 items-stretch">
          {featured && (
            <AnimatePresence mode="wait">
              <motion.article
                key={featured.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.x > SWIPE_THRESHOLD) goPrev()
                  if (info.offset.x < -SWIPE_THRESHOLD) goNext()
                }}
                className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-64 lg:h-72 overflow-hidden">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide" style={{ backgroundColor: color }}>
                      {featured.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 lg:p-7 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <Calendar className="w-3 h-3" />
                    {featured.date}
                  </div>
                  <h3 className="font-bold text-slate-900 text-xl lg:text-2xl mb-3 group-hover:text-primary-500 transition-colors">
                    {featured.title}
                  </h3>
                  <p className="text-slate-500 text-sm lg:text-base leading-relaxed mb-5 flex-1">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <Link
                      to={`/news/${featured.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-500 hover:text-primary-600 transition"
                    >
                      Read more <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={goPrev}
                        className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-white transition"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = color
                          e.currentTarget.style.borderColor = color
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = ''
                          e.currentTarget.style.borderColor = ''
                        }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goNext}
                        className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-white transition"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = color
                          e.currentTarget.style.borderColor = color
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = ''
                          e.currentTarget.style.borderColor = ''
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          )}

          <div className="flex flex-col gap-4">
            {sideItems.map((item, i) => {
              const originalIndex = newsItems.findIndex((n) => n.id === item.id)
              const unevenHeight = i === 1 ? 'h-28' : 'h-32'

              return (
                <button
                  key={item.id}
                  onClick={() => setActive(originalIndex)}
                  className="group text-left bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex">
                    <div className={`w-28 sm:w-36 ${unevenHeight} shrink-0 overflow-hidden`}>
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 sm:p-5 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 group-hover:text-primary-500 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-center mt-8">
          {newsItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === active ? 32 : 12,
                backgroundColor: i === active ? accentColors[i % accentColors.length] : '#e2e8f0',
              }}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button to="/news" variant="outline" arrow>
            View all news
          </Button>
        </div>
      </div>
    </section>
  )
}

export { NewsSection }
