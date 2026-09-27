import { clsx } from 'clsx'

/**
 * Merge class names conditionally using clsx.
 * Usage: cn('base-class', condition && 'conditional-class', className)
 */
export function cn(...inputs) {
  return clsx(inputs)
}
