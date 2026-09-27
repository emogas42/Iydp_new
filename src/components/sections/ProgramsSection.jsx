import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin, Clock, Users, ArrowRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { programs } from '@/data'

const ProgramsSection = () => {
  return (
    <section id="programs" className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <SectionHeader
            badge="Opportunities"
            badgeColor="primary"
            title="Active Programs"
            center
          />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.slice(0, 6).map((program, i) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={program.image}
                  alt={program.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      program.status === 'Open'
                        ? 'bg-accent-green text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {program.status === 'Open' && (
                      <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
                    )}
                    {program.status}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">
                    {program.type}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin className="w-3 h-3" />
                    {program.location}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">
                  {program.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {program.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {program.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {program.participants}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-sm font-semibold text-primary-500">
                    {program.funding}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:translate-x-1 transition-transform">
                    Details <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { ProgramsSection }
