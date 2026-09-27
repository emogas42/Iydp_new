import { motion } from 'framer-motion'
import { useAnimateOnScroll, fadeInUp } from '@/hooks/useAnimateOnScroll'
import { cn } from '@/utils/cn'

/**
 * Wrapper component for scroll-triggered animations.
 * Replaces repeated framer-motion boilerplate across components.
 */
const AnimatedSection = ({
  children,
  className,
  variants = fadeInUp,
  transition = { duration: 0.6 },
  threshold = 0.1,
  delay = 0,
  ...props
}) => {
  const { ref, inView } = useAnimateOnScroll({ threshold })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ ...transition, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { AnimatedSection }
