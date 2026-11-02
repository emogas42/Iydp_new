import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { api } from '@/utils/api'
import { formatDate } from '@/utils/format'

const NewsSection = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    api.getNews('page=1')
      .then((data) => { if (!cancelled) setItems((data.items || []).slice(0, 3)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  return (
    <section id="news" className="section-padding bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader badge="News & Updates" badgeColor="primary" title="Latest from" highlightedText="IYDP" center />
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <Link to={`/news/${item.id}`} className="group block rounded-lg">
                <div className="aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">
                  {item.cover_image ? (
                    <img src={item.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-8 w-8" strokeWidth={1.5} /></div>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors group-hover:text-primary-700">{item.title}</h3>
                <time dateTime={item.created_at} className="mt-1.5 block text-sm text-slate-500">{formatDate(item.created_at)}</time>
              </Link>
            </motion.article>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Button to="/news" variant="outline" arrow>All news</Button>
        </div>
      </div>
    </section>
  )
}

export { NewsSection }
