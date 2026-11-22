import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Minus } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { faqs } from '@/data'

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0)

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section className="relative py-20 lg:py-28 bg-gradient-to-b from-primary-100/55 via-slate-100/75 to-emerald-100/50 overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-green/28 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-96 h-96 bg-primary-500/26 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeader
          badge="Support"
          badgeColor="accent-green"
          title="Frequently Asked"
          highlightedText="Questions"
          center
        />

        <div className=" space-y-3">
          {faqs.slice(0, 6).map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? 'border-primary-300 bg-white shadow-md'
                    : 'border-slate-200/80 bg-white/90 hover:bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="flex items-center justify-between w-full text-left p-5 gap-4"
                >
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isOpen ? 'text-primary-600' : 'text-slate-800'
                    }`}
                  >
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isOpen
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
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
        </div>
      </div>
    </section>
  )
}

export { FAQSection }
