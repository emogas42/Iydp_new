import { cn } from '@/utils/cn'

/**
 * Semantic container component with consistent max-width and padding.
 */
const Container = ({ children, className, narrow = false, ...props }) => {
  return (
    <div
      className={cn(
        'mx-auto px-5 lg:px-8',
        narrow ? 'max-w-4xl' : 'max-w-7xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Container }
