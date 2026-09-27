import { motion } from 'framer-motion'
import { Globe, MessageCircle, Sprout, BookOpen, Handshake, ArrowRight, Award, MapPin, Calendar } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { objectives } from '@/data'

const iconMap = { Globe, MessageCircle, Sprout, BookOpen, Handshake }

const highlights = [
  { icon: Calendar, label: 'Founded', value: '2019', bg: '#00aef6' },
  { icon: Award, label: 'ESC Quality Label', value: 'Since 2020', bg: '#6f3d90' },
  { icon: MapPin, label: 'Based in', value: 'Baku, Azerbaijan', bg: '#7dba4e' },
  { icon: Globe, label: 'Reach', value: '30+ Countries', bg: '#f06e60' },
]

const AboutSection = () => {
  return (
    <section id="about" className="relative overflow-hidden">
      {/* Top part — colorful intro */}
      <div className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20 lg:py-24">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block bg-secondary-100 text-secondary-600 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wider">
                About Us
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Who is <span className="text-primary-500">IYDP</span>?
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
                The International Youth Dialogue Platform is a youth organization committed to empowering young people through international experiences and non-formal education.
              </p>
            </motion.div>
          </div>

          {/* Highlights row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {highlights.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-all text-center overflow-hidden group"
                >
                  {/* Top color bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5" style={{ backgroundColor: item.bg }} />
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${item.bg}15`, color: item.bg }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{item.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Content + Image */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative">
                <img
                  src="/images/iydp-members.jpeg"
                  alt="IYDP team collaboration"
                  className="rounded-2xl w-full h-80 lg:h-96 object-cover"
                />
                {/* Colored frame accents */}
                <div className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl border-2 border-primary-200 -z-10" />
                <div className="absolute -top-3 -left-3 w-24 h-24 bg-accent-green/20 rounded-2xl -z-10" />
                <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-secondary-200 rounded-xl -z-10" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-5"
            >
              <p className="text-slate-600 leading-relaxed">
                IYDP actively participates in international programs such as <strong className="text-primary-500">Erasmus+</strong> and the <strong className="text-secondary-500">European Solidarity Corps (ESC)</strong>, fostering collaboration, learning, and solidarity among youth.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Since 2020, the organization has held the ESC Quality Label, ensuring high-quality volunteering and educational opportunities across Europe and the Caucasus region.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Through its initiatives, IYDP promotes intercultural understanding, leadership, and employability, while building strong international partnerships.
              </p>
              <div className="pt-2">
                <Button to="/erasmus" variant="outline" arrow>
                  Learn more about Erasmus+
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom part — Objectives with colored cards */}
      <div id="mission" className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block bg-accent-green/10 text-accent-green text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wider">
              Our Mission
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Key Objectives
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {objectives.map((obj, i) => {
              const Icon = iconMap[obj.icon]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  className="group relative p-7 rounded-2xl bg-white border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Colored side stripe */}
                  <div
                    className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
                    style={{ backgroundColor: obj.color }}
                  />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
                    style={{
                      backgroundColor: `${obj.color}15`,
                      color: obj.color,
                    }}
                  >
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    {obj.text}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export { AboutSection }
