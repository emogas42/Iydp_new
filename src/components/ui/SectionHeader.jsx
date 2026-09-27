import { motion } from 'framer-motion'
import { Badge } from './Badge'

const SectionHeader = ({
  badge,
  badgeColor,
  title,
  highlightedText,
  description,
  center,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className={`max-w-2xl ${center ? 'mx-auto text-center' : ''} mb-12 ${className || ''}`}
    >
      {badge && (
        <Badge color={badgeColor} className="mb-4">
          {badge}
        </Badge>
      )}
      <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
        {title}{' '}
        {highlightedText && (
          <span className="gradient-text">{highlightedText}</span>
        )}
      </h2>
      {description && (
        <p className="text-slate-500 mt-4 text-lg leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  )
}

export { SectionHeader }
