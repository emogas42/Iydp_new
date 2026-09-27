import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

const heroWords = [
  { text: 'exchanges', color: '#00aef6' },
  { text: 'volunteering', color: '#f06e60' },
  { text: 'training', color: '#7dba4e' },
  { text: 'solidarity', color: '#6f3d90' },
]

const HeroSection = () => {
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % heroWords.length)
    }, 2800)

    return () => clearInterval(interval)
  }, [])

  const currentWord = heroWords[wordIndex]

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/images/iydp-members.jpeg"
          alt="IYDP youth team"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/55" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-28 lg:pt-36 pb-20 min-h-screen flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Connecting young people through{' '}
            <span
              className="inline-flex min-w-[6ch] justify-center items-center font-black text-white rounded-full px-5 py-1.5 transition-all duration-500 align-middle"
              style={{ backgroundColor: currentWord.color }}
            >
              {currentWord.text}
            </span>
          </h1>

          <p className="text-white/95 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto mb-10">
            IYDP helps young people join international projects, Erasmus+ opportunities, and practical cross-cultural learning experiences.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Button to="/opportunities" className="font-bold px-7 py-3 text-sm sm:text-base shadow-lg shadow-primary-900/25" arrow>
              Explore Programs
            </Button>
            <Button to="/erasmus" variant="outline" className="font-bold px-7 py-3 text-sm sm:text-base border-white/80 text-white hover:bg-white hover:text-slate-900" arrow>
              Learn About Erasmus+
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { HeroSection }
