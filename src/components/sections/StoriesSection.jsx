import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { stories } from '@/data'

const colors = ['#00aef6', '#6f3d90', '#7dba4e', '#f06e60']
const SWIPE_THRESHOLD = 70

const StoriesSection = () => {
  const [active, setActive] = useState(0)
  const goPrev = () => setActive((prev) => (prev - 1 + stories.length) % stories.length)
  const goNext = () => setActive((prev) => (prev + 1) % stories.length)

  useEffect(() => {
    if (stories.length <= 1) return

    const timer = setInterval(() => {
      goNext()
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const story = stories[active]
  const color = colors[active % colors.length]

  return (
    <section id="stories" className="py-20 lg:py-28 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeader
          badge="Real experiences"
          badgeColor="accent-red"
          title="Stories from our"
          highlightedText="community"
          center
        />

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-stretch">
          {/* Left — Thumbnail selector */}
          <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {stories.map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => setActive(i)}
                whileHover={{ scale: 1.02 }}
                className={`relative flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 shrink-0 w-72 lg:w-full ${
                  i === active
                    ? 'bg-white shadow-lg border-l-4'
                    : 'bg-white/60 hover:bg-white border-l-4 border-transparent'
                }`}
                style={{
                  borderLeftColor: i === active ? colors[i % colors.length] : 'transparent',
                }}
              >
                <img
                  src={s.avatar}
                  alt={s.author}
                  className={`w-12 h-12 rounded-full object-cover ring-2 transition-all shrink-0 ${
                    i === active ? 'ring-offset-2' : 'ring-transparent'
                  }`}
                  style={{ ringColor: i === active ? colors[i % colors.length] : undefined }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.author}</p>
                  <p className="text-xs text-slate-400 truncate">{s.role}</p>
                </div>
                {i === active && (
                  <motion.div
                    layoutId="story-indicator"
                    className="absolute right-4 w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Right — Active story display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => {
                if (info.offset.x > SWIPE_THRESHOLD) goPrev()
                if (info.offset.x < -SWIPE_THRESHOLD) goNext()
              }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="relative h-56 lg:h-64 overflow-hidden">
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span
                    className="text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    {story.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 lg:p-10 flex-1 flex flex-col">
                <Quote className="w-8 h-8 mb-4" style={{ color }} />
                <h3 className="text-xl lg:text-2xl font-bold text-slate-900 mb-3">
                  {story.title}
                </h3>
                <p className="text-slate-500 leading-relaxed flex-1 mb-6">
                  {story.excerpt}
                </p>

                {/* Author + nav */}
                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={story.avatar}
                      alt={story.author}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-1"
                      style={{ ringColor: color }}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{story.author}</p>
                      <p className="text-xs text-slate-400">{story.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={goPrev}
                      className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.borderColor = color }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.borderColor = '' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={goNext}
                      className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.borderColor = color }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.borderColor = '' }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 justify-center mt-10">
          {stories.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === active ? 32 : 12,
                backgroundColor: i === active ? colors[i % colors.length] : '#e2e8f0',
              }}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <Button to="/stories" variant="outline" arrow>
            Read all stories
          </Button>
        </div>
      </div>
    </section>
  )
}

export { StoriesSection }
