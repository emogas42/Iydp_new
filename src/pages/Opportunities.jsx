import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye, ArrowRight, Calendar, MapPin, Clock, Users } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { programs } from '@/data'
import { Link } from 'react-router-dom'

const rotatingWords = [
  { text: 'exchanges', color: '#00aef6' },
  { text: 'volunteering', color: '#f06e60' },
  { text: 'seminars', color: '#7dba4e' },
]

const Opportunities = () => {
  const [search, setSearch] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [durationFilter, setDurationFilter] = useState('all')
  const [fundingFilter, setFundingFilter] = useState(false)
  const [sortBy, setSortBy] = useState('default')

  // Rotate words
  useState(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 3000)
    return () => clearInterval(interval)
  })

  let filtered = programs.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase()) ||
    p.type.toLowerCase().includes(search.toLowerCase())
  )

  // Duration filter
  if (durationFilter === 'short') {
    filtered = filtered.filter((p) => {
      const dur = p.duration.toLowerCase()
      return dur.includes('day') || (dur.includes('month') && parseInt(dur) <= 3)
    })
  } else if (durationFilter === 'long') {
    filtered = filtered.filter((p) => {
      const dur = p.duration.toLowerCase()
      return dur.includes('month') && parseInt(dur) > 3
    })
  }

  // Funding filter
  if (fundingFilter) {
    filtered = filtered.filter((p) => p.funding.toLowerCase().includes('fully'))
  }

  // Sort
  if (sortBy === 'latest') {
    filtered = [...filtered].reverse()
  }

  const currentWord = rotatingWords[wordIndex]

  const filterBtn = (label, active, onClick) => (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-primary-500 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-500'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />

        <Container className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary-500 text-sm font-semibold mb-3 uppercase tracking-wider text-center">
              Explore
            </p>
            <h1 className="text-3xl flex items-center justify-center flex-wrap lg:text-4xl font-bold text-slate-900 leading-tight mb-4 text-center">
              We provide opportunities in trainings,{' '}&nbsp;
              <span
                className="flex w-fit items-center justify-center font-black text-white rounded-full px-4 py-1 transition-all duration-500"
                style={{ backgroundColor: currentWord.color }}
              >
                {currentWord.text}
              </span>{' '}&nbsp;and many more.
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto text-center">
              Join international programs, youth exchanges, training courses, and
              volunteering opportunities across Europe and beyond.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Content */}
      <section className="py-12 lg:py-16">
        <Container>
          {/* Search & Filters */}
          <div className="flex flex-col gap-4 mb-10">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filterBtn('All', durationFilter === 'all' && !fundingFilter && sortBy === 'default', () => {
                setDurationFilter('all')
                setFundingFilter(false)
                setSortBy('default')
              })}
              {filterBtn('Short Term', durationFilter === 'short', () =>
                setDurationFilter(durationFilter === 'short' ? 'all' : 'short')
              )}
              {filterBtn('Long Term', durationFilter === 'long', () =>
                setDurationFilter(durationFilter === 'long' ? 'all' : 'long')
              )}
              {filterBtn('Fully Funded', fundingFilter, () =>
                setFundingFilter(!fundingFilter)
              )}
              {filterBtn('Latest First', sortBy === 'latest', () =>
                setSortBy(sortBy === 'latest' ? 'default' : 'latest')
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((program, i) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={program.image}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      program.status === 'Open' ? 'bg-accent-green text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {program.status === 'Open' && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />}
                      {program.status}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">{program.type}</span>
                    <span className="flex items-center gap-1 text-slate-400 text-xs"><MapPin className="w-3 h-3" />{program.location}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">{program.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">{program.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{program.duration}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{program.participants}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-sm font-semibold text-primary-500">{program.funding}</span>
                    <span className="flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:translate-x-1 transition-transform">
                      Apply <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No programs found matching your search.</p>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}

export { Opportunities }
