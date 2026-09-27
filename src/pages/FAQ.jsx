import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, Plus, Minus } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { faqs } from '@/data'

const categories = ['All', ...new Set(faqs.map((f) => f.category))]

const FAQ = () => {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [openIndex, setOpenIndex] = useState(0)

  const filtered = faqs.filter((faq) => {
    const matchSearch =
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
    const matchCategory =
      activeCategory === 'All' || faq.category === activeCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <Container className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-accent-green text-sm font-semibold mb-3 uppercase tracking-wider">Support</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">Frequently Asked Questions</h1>
            <p className="text-slate-500 max-w-xl mx-auto">Everything you need to know about Erasmus+, ESC, and IYDP programs.</p>
          </motion.div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 shrink-0 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 transition"
                />
              </div>
              <div className="flex lg:flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeCategory === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ List */}
            <div className="flex-1 space-y-3">
              {filtered.map((faq, i) => {
                const isOpen = openIndex === i
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? 'border-primary-200 bg-primary-50/30 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="flex items-center justify-between w-full text-left p-5 gap-4"
                    >
                      <span className={`text-sm font-semibold transition-colors ${isOpen ? 'text-primary-600' : 'text-slate-800'}`}>
                        {faq.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                          isOpen ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400">No questions match your search.</p>
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}

export { FAQ }
