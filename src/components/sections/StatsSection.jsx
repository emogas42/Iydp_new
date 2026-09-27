import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { stats } from '@/data'

const Counter = ({ target, suffix }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 1400
          const start = performance.now()
          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(target * eased))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

const StatsSection = () => {
  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-white py-20 overflow-hidden border-y border-slate-100">
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-3">
                <Counter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
              <div
                className="w-12 h-0.5 mx-auto mt-4 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { StatsSection }
