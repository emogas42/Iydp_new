import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { ArrowRight } from 'lucide-react'

const variants = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20',
  secondary:
    'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20',
  outline:
    'border border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  dark:
    'bg-slate-900 text-white hover:bg-slate-800',
}

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-sm',
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  to,
  arrow,
  animate = true,
  className,
  ...props
}) => {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300',
    variants[variant],
    sizes[size],
    className
  )

  const Wrapper = animate ? motion.span : 'span'
  const wrapperProps = animate
    ? { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } }
    : {}

  const inner = (
    <>
      {children}
      {arrow && <ArrowRight className="w-3.5 h-3.5" />}
    </>
  )

  if (to) {
    return (
      <Wrapper {...wrapperProps} className="inline-block">
        <Link to={to} className={classes} {...props}>
          {inner}
        </Link>
      </Wrapper>
    )
  }

  if (href) {
    return (
      <Wrapper {...wrapperProps} className="inline-block">
        <a href={href} className={classes} {...props}>
          {inner}
        </a>
      </Wrapper>
    )
  }

  return (
    <Wrapper {...wrapperProps} className="inline-block">
      <button className={classes} {...props}>
        {inner}
      </button>
    </Wrapper>
  )
}

export { Button }
