import { motion } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { stories } from '@/data'

const Stories = () => {
  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-secondary-50 py-16 lg:py-24 overflow-hidden">
        <Container className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-secondary-500 text-sm font-semibold mb-3 uppercase tracking-wider">Real experiences</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">Stories from our community</h1>
            <p className="text-slate-500 max-w-xl mx-auto">Read personal journeys, reflections and insights shared by young people who have participated in IYDP programs.</p>
          </motion.div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="h-48 overflow-hidden">
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={story.avatar} alt={story.author} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-100" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{story.author}</p>
                      <p className="text-xs text-slate-400">{story.role}</p>
                    </div>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-2">{story.category}</span>
                  <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">{story.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{story.excerpt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  )
}

export { Stories }
