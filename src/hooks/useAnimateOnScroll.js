import { useInView } from 'react-intersection-observer'

/**
 * Reusable hook for scroll-triggered animations.
 * Returns { ref, inView } to attach to animated elements.
 */
export function useAnimateOnScroll({ threshold = 0.1, triggerOnce = true } = {}) {
  const [ref, inView] = useInView({
    triggerOnce,
    threshold,
  })

  return { ref, inView }
}

/**
 * Standard animation variants for Framer Motion.
 */
export const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export const fadeInDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
}

export const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}
