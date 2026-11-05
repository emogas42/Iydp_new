import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { faqs } from '@/data'

const EASE = [0.22, 1, 0.36, 1]
const ALL = 'All'

const categories = [ALL, ...new Set(faqs.map((f) => f.category))]
const items = faqs.map((f, id) => ({ ...f, id }))

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const Highlight = ({ text, query }) => {
  if (!query) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-primary-100 px-0.5 text-inherit">{part}</mark>
    ) : (
      part
    )
  )
}

const DashedArrow = ({ className, flip = false }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 80"
    fill="none"
    className={className}
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path
      d="M6 14c14-10 34-8 34 4 0 10-16 12-20 4-5-10 14-14 26-2 12 12 26 30 62 34"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeDasharray="5 6"
      strokeLinecap="round"
    />
    <path d="M100 47l10 7-11 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FAQItem = ({ item, isOpen, onToggle, query }) => {
  const panelId = `faq-panel-${item.id}`
  const buttonId = `faq-button-${item.id}`

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`rounded-md border transition-[background-color,border-color,box-shadow] duration-300 ${
        isOpen
          ? 'border-primary-200 bg-primary-50/40 shadow-[0_8px_30px_-16px_rgba(0,174,246,0.35)]'
          : 'border-slate-200/80 bg-white hover:border-slate-300'
      }`}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center gap-4 rounded-md px-5 py-5 text-left sm:px-6 sm:py-6"
        >
          <span
            aria-hidden="true"
            className={`mt-2 h-1.5 w-1.5 shrink-0 self-start rounded-full transition-colors sm:mt-[11px] duration-300 ${
              isOpen ? 'bg-primary-500' : 'bg-primary-400'
            }`}
          />
          <span className="flex-1 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            <Highlight text={item.question} query={query} />
          </span>
          <span aria-hidden="true" className="relative flex h-6 w-6 shrink-0 items-center justify-center text-slate-700">
            <span className="absolute h-[1.5px] w-4 rounded-full bg-current" />
            <motion.span
              className="absolute h-4 w-[1.5px] rounded-full bg-current"
              animate={{ scaleY: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.4, ease: EASE }, opacity: { duration: 0.25 } }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-6 pl-[42px] text-[15px] leading-relaxed text-slate-600 sm:px-6 sm:pl-[46px] sm:text-base">
              <Highlight text={item.answer} query={query} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const FAQ = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [openId, setOpenId] = useState(items[0]?.id ?? null)

  const query = search.trim()

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter(
      (f) =>
        (category === ALL || f.category === category) &&
        (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    )
  }, [query, category])

  const selectCategory = (cat) => {
    setCategory(cat)
    setOpenId(null)
  }

  return (
    <div className="relative min-h-screen overflow-hidden pt-[72px]">
      {/* Soft brand-tinted backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px]">
        <motion.div
          className="absolute -top-24 left-1/2 h-[460px] w-[1100px] -translate-x-1/2 rounded-full bg-primary-100/60 blur-3xl"
          animate={{ scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white" />
      </div>

      <motion.div
        className="pointer-events-none absolute left-2 top-[120px] hidden text-primary-400 lg:block"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
      >
        <DashedArrow className="h-16 w-24" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-2 top-[280px] hidden text-primary-400 lg:block"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
      >
        <DashedArrow className="h-16 w-28 rotate-[-8deg]" flip />
      </motion.div>

      <section className="relative pt-14 pb-10 lg:pt-20 lg:pb-12">
        <Container className="text-center">
          <motion.nav aria-label="Breadcrumb" {...fadeUp(0)}>
            <ol className="flex items-center justify-center gap-1.5 text-sm">
              <li>
                <Link to="/" className="text-slate-500 transition-colors hover:text-primary-600">Home</Link>
              </li>
              <li aria-hidden="true" className="text-slate-500">/</li>
              <li aria-current="page" className="text-slate-800">FAQ</li>
            </ol>
          </motion.nav>

          <motion.h1
            {...fadeUp(0.08)}
            className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          >
            Frequently asked questions
          </motion.h1>

          <motion.div {...fadeUp(0.16)} className="relative mx-auto mt-10 max-w-2xl">
            <label htmlFor="faq-search" className="sr-only">Search questions</label>
            <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              id="faq-search"
              type="search"
              placeholder="Enter a keyword"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-base border border-slate-200/80 bg-white/90 py-4 pl-[52px] pr-12 text-base text-slate-800 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur placeholder:text-slate-500 transition focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100 [&::-webkit-search-cancel-button]:hidden"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            {...fadeUp(0.24)}
            role="tablist"
            aria-label="Question categories"
            className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-2"
          >
            <LayoutGroup id="faq-categories">
              {categories.map((cat) => {
                const active = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectCategory(cat)}
                    className={`relative rounded-base px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${
                      active ? 'text-white' : 'bg-white/80 text-slate-600 ring-1 ring-inset ring-slate-200/80 hover:text-slate-900 hover:ring-slate-300'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="faq-category-pill"
                        className="absolute inset-0 rounded-base bg-primary-500 shadow-[0_6px_16px_-6px_rgba(0,174,246,0.6)]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{cat}</span>
                  </button>
                )
              })}
            </LayoutGroup>
          </motion.div>
        </Container>
      </section>

      <section className="relative pb-24 lg:pb-32">
        <Container>
          <div className="mx-auto max-w-5xl space-y-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((item) => (
                <FAQItem
                  key={item.id}
                  item={item}
                  query={query}
                  isOpen={openId === item.id}
                  onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-20 text-center"
                >
                  <p className="text-lg font-medium text-slate-800">No questions match your search</p>
                  <p className="mt-2 text-slate-500">
                    Try another keyword, or{' '}
                    <Link to="/contact" className="font-medium text-primary-600 hover:text-primary-700">
                      ask us directly
                    </Link>
                    .
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Container>
      </section>
    </div>
  )
}

export { FAQ }
