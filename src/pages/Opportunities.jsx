import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Calendar, MapPin } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { api } from '@/utils/api'
import { Link } from 'react-router-dom'

const rotatingWords = [
  { text: 'exchanges', color: '#00aef6' },
  { text: 'volunteering', color: '#f06e60' },
  { text: 'seminars', color: '#7dba4e' },
]

const formatDeadline = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Open'

const Opportunities = () => {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')

  useEffect(() => {
    api.getOpportunities()
      .then((data) => setPrograms(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Rotate words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  let filtered = programs.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  )

  if (statusFilter === 'active') {
    filtered = filtered.filter((p) => !p.is_closed)
  } else if (statusFilter === 'closed') {
    filtered = filtered.filter((p) => p.is_closed)
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
              {filterBtn('All', statusFilter === 'all', () => setStatusFilter('all'))}
              {filterBtn('Active', statusFilter === 'active', () => setStatusFilter('active'))}
              {filterBtn('Closed', statusFilter === 'closed', () => setStatusFilter('closed'))}
              {filterBtn('Latest First', sortBy === 'latest', () =>
                setSortBy(sortBy === 'latest' ? 'default' : 'latest')
              )}
            </div>
          </div>

          {loading && (
            <div className="text-center py-20">
              <p className="text-slate-400">Loading...</p>
            </div>
          )}

          {/* Grid */}
          {!loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((program, i) => (
              <Link
                to={`/opportunity/${program.id}`}
                key={program.id}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 h-full"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    {program.keyword_image && (
                      <img
                        src={`/static/esc/${program.keyword_image}`}
                        alt={program.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        !program.is_closed ? 'bg-accent-green text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {!program.is_closed && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />}
                        {program.is_closed ? 'Closed' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">
                        {program.tags?.[0] || 'Program'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 text-xs"><MapPin className="w-3 h-3" />{program.location}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">{program.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">{(program.description || '').replace(/<[^>]*>/g, '')}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3" />{formatDeadline(program.deadline)}</span>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:translate-x-1 transition-transform">
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
          )}

          {!loading && filtered.length === 0 && (
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
