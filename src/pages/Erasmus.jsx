import { motion } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import {
  Globe,
  Users,
  GraduationCap,
  Heart,
  Award,
  Calendar,
  MapPin,
  BookOpen,
  Lightbulb,
  Target,
  Handshake,
  ArrowRight,
} from 'lucide-react'

const pillars = [
  {
    icon: GraduationCap,
    title: 'Youth Exchanges',
    description:
      'Short-term group activities (5–21 days) that bring together young people from different countries to share experiences, learn from each other, and develop new skills through non-formal education.',
    color: '#00aef6',
  },
  {
    icon: BookOpen,
    title: 'Training Courses',
    description:
      'Professional development activities (2–60 days) for youth workers and leaders, focusing on methodology, project management, and capacity building in the youth sector.',
    color: '#6f3d90',
  },
  {
    icon: Heart,
    title: 'European Solidarity Corps',
    description:
      'Long-term volunteering placements (2–12 months) that allow young people aged 18–30 to contribute to communities across Europe while gaining invaluable life experience.',
    color: '#7dba4e',
  },
  {
    icon: Handshake,
    title: 'Capacity Building',
    description:
      'Strategic partnership projects that strengthen youth organizations, build networks, and improve the quality of non-formal learning across borders.',
    color: '#f06e60',
  },
]

const keyFacts = [
  { icon: Calendar, label: 'Established', value: '1987' },
  { icon: Globe, label: 'Countries', value: '33+ participating' },
  { icon: Users, label: 'Participants since 2014', value: '13 million+' },
  { icon: Award, label: 'Annual Budget', value: '€26.2 billion (2021–27)' },
]

const benefits = [
  {
    icon: Globe,
    title: 'International Experience',
    text: 'Live and work in a different country, immerse yourself in a new culture, and build a global perspective.',
  },
  {
    icon: Users,
    title: 'Networking',
    text: 'Connect with like-minded young people, youth workers, and organizations from across Europe and beyond.',
  },
  {
    icon: GraduationCap,
    title: 'Skills Development',
    text: 'Gain leadership, communication, teamwork, and problem-solving skills through hands-on non-formal education.',
  },
  {
    icon: Award,
    title: 'Youthpass Certificate',
    text: 'Receive an officially recognized European certificate documenting the competences you developed during the project.',
  },
  {
    icon: Lightbulb,
    title: 'Personal Growth',
    text: 'Step out of your comfort zone, gain self-confidence, and discover new passions and career directions.',
  },
  {
    icon: Target,
    title: 'Fully Funded',
    text: 'Most projects cover travel, accommodation, meals, insurance, and provide a monthly allowance — making them accessible to all.',
  },
]

const timeline = [
  { year: '1987', event: 'Erasmus programme launched for higher education exchange.' },
  { year: '2014', event: 'Erasmus+ created, merging all EU education, training, youth and sport programmes.' },
  { year: '2018', event: 'European Solidarity Corps established as a standalone programme.' },
  { year: '2020', event: 'IYDP receives ESC Quality Label for hosting and sending volunteers.' },
  { year: '2021', event: 'New Erasmus+ 2021-2027 programme period begins with doubled budget.' },
  { year: '2024', event: 'IYDP expands to 30+ partner countries across Europe and the Caucasus.' },
]

const Erasmus = () => {
  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        <Container className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <p className="text-primary-500 text-sm font-semibold mb-3 uppercase tracking-wider">
              About the Programme
            </p>
            <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
              Erasmus+ & European Solidarity Corps
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto">
              Erasmus+ is the European Union's flagship programme for education,
              training, youth and sport. Since 1987, it has given millions of
              young people the opportunity to study, train, volunteer and gain
              experience abroad.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* What is Erasmus+ */}
      <section className="py-16 lg:py-20">
        <Container>
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block bg-primary-50 text-primary-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                Overview
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                What is Erasmus+?
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Erasmus+ is one of the most successful and well-known programmes of the European Union. It supports education, training, youth and sport across Europe and partner countries worldwide.
                </p>
                <p>
                  For the <strong className="text-slate-900">2021–2027 programme period</strong>, Erasmus+ has a budget of €26.2 billion — nearly double the previous period — reflecting the EU's commitment to investing in people and their futures.
                </p>
                <p>
                  The youth strand of Erasmus+ specifically targets young people aged 13–30 and youth workers, offering opportunities for <strong className="text-slate-900">non-formal learning, cross-cultural dialogue, and active citizenship</strong>.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {keyFacts.map((fact, i) => {
                const Icon = fact.icon
                return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -3 }}
                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-900 text-lg">{fact.value}</p>
                    <p className="text-slate-500 text-xs mt-1">{fact.label}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Programme Pillars */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="inline-block bg-secondary-50 text-secondary-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Programme Areas
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              How can you participate?
            </h2>
            <p className="text-slate-500 mt-3">
              Erasmus+ Youth and the European Solidarity Corps offer several ways for young people to get involved internationally.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  className="group bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
                    style={{ backgroundColor: `${pillar.color}15`, color: pillar.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{pillar.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{pillar.description}</p>
                </motion.div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-16 lg:py-20">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="inline-block bg-accent-green/10 text-accent-green text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Why Participate?
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Benefits of Erasmus+ projects
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -3 }}
                  className="group p-6 rounded-xl border border-slate-100 bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center mb-4 transition-all group-hover:scale-110">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="inline-block bg-accent-red/10 text-accent-red text-xs font-semibold px-3 py-1 rounded-full mb-4">
              History
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Erasmus+ timeline
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            {timeline.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-6 mb-8 last:mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {item.year.slice(2)}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className="w-0.5 flex-1 bg-primary-100 mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <p className="text-xs font-bold text-primary-500 mb-1">{item.year}</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* IYDP's Role */}
      <section className="py-16 lg:py-20">
        <Container>
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block bg-secondary-50 text-secondary-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                IYDP & Erasmus+
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Our role in the programme
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  The <strong className="text-slate-900">International Youth Dialogue Platform (IYDP)</strong> is an accredited Erasmus+ and European Solidarity Corps organization based in Baku, Azerbaijan.
                </p>
                <p>
                  Since receiving the <strong className="text-slate-900">ESC Quality Label in 2020</strong>, IYDP has been actively sending and hosting volunteers, organizing youth exchanges, training courses, and capacity-building projects across Europe and the Caucasus region.
                </p>
                <p>
                  We serve as a bridge connecting Azerbaijani youth with international opportunities, ensuring they gain access to the same transformative experiences available to young people across EU member states and partner countries.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button to="/opportunities" arrow>
                  View current projects
                </Button>
                <Button to="/contact" variant="outline">
                  Partner with us
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {[
                { label: 'ESC Quality Label', value: 'Since 2020', icon: Award },
                { label: 'Partner Countries', value: '30+', icon: Globe },
                { label: 'Projects Delivered', value: '50+', icon: Target },
                { label: 'Youth Impacted', value: '5,000+', icon: Users },
              ].map((stat, i) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={i}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-4">
              Ready to start your Erasmus+ journey?
            </h2>
            <p className="text-slate-500 mb-8">
              Whether you want to volunteer abroad, join a youth exchange, or attend a training course — IYDP can help you take the first step.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button to="/opportunities" size="lg" arrow>
                Explore opportunities
              </Button>
              <Button to="/contact" variant="outline" size="lg">
                Contact us
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  )
}

export { Erasmus }
