import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { usePagedList } from '@/hooks/usePagedList'
import { api } from '@/utils/api'

const EASE = [0.22, 1, 0.36, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const COPY = {
  present: { crumb: 'Present', title: 'Present Projects', empty: 'No present projects right now', emptyHint: 'New projects are announced here. Check back soon.' },
  finished: { crumb: 'Finished', title: 'Finished Projects', empty: 'No finished projects yet', emptyHint: 'Completed projects will be listed here.' },
}

const Projects = ({ phase = 'present' }) => {
  const copy = COPY[phase]
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchPage = useCallback(
    (page) => {
      const params = new URLSearchParams({ phase, page: String(page) })
      if (query) params.set('search', query)
      return api.getProjects(params.toString())
    },
    [phase, query]
  )
  const { items, loading, error, hasNext, sentinelRef, retry } = usePagedList(fetchPage)

  return (
    <div className="relative min-h-screen overflow-hidden pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px]">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white" />
      </div>

      <section className="relative pt-14 pb-10 lg:pt-20 lg:pb-12">
        <Container className="text-center">
          <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
            <ol className="flex items-center justify-center gap-1.5 text-sm">
              <li><Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link></li>
              <li aria-hidden="true" className="text-slate-400">/</li>
              <li className="text-slate-500">Projects</li>
              <li aria-hidden="true" className="text-slate-400">/</li>
              <li aria-current="page" className="text-slate-800">{copy.crumb}</li>
            </ol>
          </motion.nav>
          <motion.h1 {...fadeUp(0.08)} className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl">
            {copy.title}
          </motion.h1>
          <motion.div {...fadeUp(0.14)} className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {[['/projects', 'Present', true], ['/projects/finished', 'Finished', false]].map(([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-md px-5 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-slate-600 hover:text-slate-900'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="relative pb-24 lg:pb-32">
        <Container>
          <motion.div {...fadeUp(0.2)} className="relative mx-auto max-w-2xl">
            <label htmlFor="project-search" className="sr-only">Search projects</label>
            <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="project-search"
              type="search"
              placeholder="Search by name or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-4 pl-[52px] pr-12 text-base text-slate-800 placeholder:text-slate-400 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((project, i) => <ProjectCard key={project.id} project={project} index={i} />)}
            {loading && items.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} aria-hidden="true">
                <div className="aspect-[4/5] animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>

          {!loading && !error && items.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-slate-800">{query ? `No projects match “${query}”` : copy.empty}</p>
              <p className="mt-2 text-slate-500">{query ? 'Try a different keyword.' : copy.emptyHint}</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center">
              <p className="text-slate-600">Projects could not be loaded.</p>
              <button type="button" onClick={retry} className="mt-4 rounded-md border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
                Try again
              </button>
            </div>
          )}

          {hasNext && !error && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
        </Container>
      </section>
    </div>
  )
}

export { Projects }
