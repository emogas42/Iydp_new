import { useScrollToTop } from '@/hooks/useScrollToTop'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/**
 * Handles scroll-to-top on route change.
 * Also renders a floating "back to top" button.
 */
const ScrollToTop = () => {
  useScrollToTop()
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowButton(window.scrollY > 500)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center hover:bg-primary-600 transition-colors duration-300"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export { ScrollToTop }
