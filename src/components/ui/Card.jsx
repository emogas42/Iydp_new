import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

/**
 * Base card component with hover lift effect.
 */
const Card = ({
  children,
  className,
  hover = true,
  padding = true,
  as: Component = 'div',
  ...props
}) => {
  const Wrapper = hover ? motion.div : Component

  return (
    <Wrapper
      className={cn(
        'bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300',
        hover && 'hover:border-slate-200 hover:shadow-xl',
        padding && 'p-6',
        className
      )}
      {...(hover && {
        whileHover: { y: -4 },
        transition: { duration: 0.3 },
      })}
      {...props}
    >
      {children}
    </Wrapper>
  )
}

/**
 * Card with image on top.
 */
const ImageCard = ({
  image,
  imageAlt = '',
  imageFallback,
  badge,
  badgeVariant = 'success',
  children,
  className,
  ...props
}) => {
  const badgeColors = {
    success: 'bg-accent-green/90 text-white',
    warning: 'bg-amber-500/90 text-white',
    danger: 'bg-accent-red/90 text-white',
    dark: 'bg-slate-800/90 text-white',
    primary: 'bg-primary-500/90 text-white',
  }

  return (
    <Card padding={false} className={className} {...props}>
      <div className="relative h-48 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          imageFallback || (
            <div className="w-full h-full bg-slate-100" />
          )
        )}
        <div className="absolute inset-0 bg-black/10" />

        {badge && (
          <div className="absolute top-4 right-4">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm',
                badgeColors[badgeVariant]
              )}
            >
              {badge}
            </span>
          </div>
        )}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  )
}

export { Card, ImageCard }
