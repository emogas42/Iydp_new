import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const heroSlides = [
  {
    text: 'exchanges',
    tag: 'Youth Exchanges',
    color: '#00aef6',
    glowColor: 'rgba(0, 174, 246, 0.28)',
    image: '/images/hero-exchanges.jpg',
    description: 'IYDP helps young people join international projects, Erasmus+ opportunities, and practical cross-cultural learning experiences.',
    primaryBtn: { text: 'Explore Programs', to: '/opportunities' },
  },
  {
    text: 'volunteering',
    tag: 'European Solidarity Corps',
    color: '#f06e60',
    glowColor: 'rgba(240, 110, 96, 0.28)',
    image: '/images/hero-volunteering.jpg',
    description: 'Discover long-term and short-term ESC volunteering projects across Europe with all travel and living expenses fully funded.',
    primaryBtn: { text: 'Explore Volunteering', to: '/opportunities' },
  },
  {
    text: 'training',
    tag: 'Non-Formal Education',
    color: '#7dba4e',
    glowColor: 'rgba(125, 186, 78, 0.28)',
    image: '/images/hero-training.jpg',
    description: 'Develop essential leadership, project management, and youth work competences through high-impact international training courses.',
    primaryBtn: { text: 'Learn About Training', to: '/erasmus' },
  },
  {
    text: 'solidarity',
    tag: 'Intercultural Dialogue',
    color: '#6f3d90',
    glowColor: 'rgba(111, 61, 144, 0.32)',
    image: '/images/hero-solidarity.jpg',
    description: 'Build lifelong cross-border friendships, break cultural stereotypes, and create lasting positive change for youth.',
    primaryBtn: { text: 'Join Our Community', to: '/register' },
  },
]

// 1.2s smooth slow transition as requested, with 4s slide duration
const SLIDE_DURATION = 4000 
const TRANSITION_DURATION = 1.2 
const TRANSITION_EASE = [0.4, 0, 0.2, 1]

const HeroSection = () => {
  const [slideIndex, setSlideIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)

  // Preload all images so transitions are instant and seamless
  useEffect(() => {
    heroSlides.forEach((slide) => {
      const img = new Image()
      img.src = slide.image
    })
  }, [])

  // Auto-play timer
  useEffect(() => {
    if (isPaused) return

    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % heroSlides.length)
    }, SLIDE_DURATION)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, slideIndex])

  const currentSlide = heroSlides[slideIndex]

  const goToPrev = () => {
    setSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  const goToNext = () => {
    setSlideIndex((prev) => (prev + 1) % heroSlides.length)
  }

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-slate-950 flex flex-col justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic Background Slides with Smooth 1.2s Crossfade */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence initial={false}>
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
            className="absolute inset-0"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.tag}
              className="w-full h-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Dark + Brand Color Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />
        <motion.div
          key={`glow-${slideIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${currentSlide.glowColor} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-32 lg:pt-40 pb-16 flex-1 flex items-center justify-center text-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Dynamic Category Tag - Synchronized 1.2s Grid Crossfade */}
          <div className="flex justify-center mb-6">
            <div className="inline-grid items-center justify-center">
              <AnimatePresence initial={false}>
                <motion.div
                  key={currentSlide.tag}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
                  style={{
                    gridArea: '1 / 1',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    border: `1px solid ${currentSlide.color}88`,
                  }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider backdrop-blur-md shadow-sm"
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: currentSlide.color }}
                  />
                  <span className="uppercase">{currentSlide.tag}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Heading with Stable Line Breaks & Dynamic Word Pill */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] tracking-tight mb-6 drop-shadow-md [text-wrap:unset]">
            <span className="block whitespace-nowrap">Connecting young people</span>
            <span className="inline-flex items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 mt-1 sm:mt-2">
              <span>through</span>
              <span className="inline-grid items-center justify-center align-middle relative">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={currentSlide.text}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
                    style={{
                      gridArea: '1 / 1',
                      backgroundColor: currentSlide.color,
                      boxShadow: `0 10px 25px -4px ${currentSlide.color}90`,
                    }}
                    className="inline-flex min-w-[6.5ch] justify-center items-center font-black text-white rounded-full px-5 py-1.5 align-middle shadow-lg"
                  >
                    {currentSlide.text}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </h1>

          {/* Dynamic Description - Synchronized 1.2s Grid Crossfade */}
          <div className="min-h-[72px] sm:min-h-[58px] grid items-center justify-center mb-8">
            <AnimatePresence initial={false}>
              <motion.p
                key={currentSlide.description}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
                style={{ gridArea: '1 / 1' }}
                className="text-white/95 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto drop-shadow-sm font-normal"
              >
                {currentSlide.description}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Call-to-Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mb-4"
          >
            <Button
              to={currentSlide.primaryBtn.to}
              className="font-bold px-7 py-3 text-sm sm:text-base shadow-xl transition-all duration-700"
              style={{ backgroundColor: currentSlide.color }}
              arrow
            >
              {currentSlide.primaryBtn.text}
            </Button>
            <Button
              to="/erasmus"
              variant="outline"
              className="font-bold px-7 py-3 text-sm sm:text-base border-white/80 text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-sm"
              arrow
            >
              Learn About Erasmus+
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Slide Controls & Selectors */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 pb-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/15">
          {/* Left / Right arrow navigation */}
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <button
              onClick={goToPrev}
              aria-label="Əvvəlki slayd"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition border border-white/20 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              aria-label="Növbəti slayd"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition border border-white/20 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Slide Selector Tabs */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {heroSlides.map((slide, i) => {
              const isActive = i === slideIndex
              return (
                <button
                  key={slide.text}
                  onClick={() => setSlideIndex(i)}
                  className={`px-4 py-2.5 rounded-xl transition-all duration-500 border ${
                    isActive
                      ? 'bg-white/20 backdrop-blur-md border-white/40 shadow-lg'
                      : 'bg-black/25 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full transition-transform duration-500"
                      style={{
                        backgroundColor: slide.color,
                        transform: isActive ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span
                      className={`text-xs font-bold tracking-wide capitalize transition-colors duration-500 ${
                        isActive ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {slide.text}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export { HeroSection }
