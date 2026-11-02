import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

const Avatar = ({ src, name, className = 'h-10 w-10 text-sm' }) =>
  src ? (
    <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-secondary-50 font-semibold text-secondary-500 ring-2 ring-white`}
    >
      {initials(name)}
    </span>
  )

const StoryCard = ({ story, index = 0, animateOnView = false }) => {
  const [loaded, setLoaded] = useState(false)

  const motionProps = animateOnView
    ? { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' } }
    : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.article
      layout="position"
      {...motionProps}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.6, ease: EASE, delay: (index % 9) * 0.06 }}
    >
      <Link to={`/stories/${story.slug}`} className="group block rounded-xl focus-visible:ring-offset-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
          {story.cover_image ? (
            <>
              {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200/70" />}
              <img
                src={story.cover_image}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-smooth group-hover:scale-[1.04] ${
                  loaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50">
              <Avatar src={story.avatar} name={story.author_name} className="h-20 w-20 text-2xl" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
          {story.program && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
              {story.program}
            </span>
          )}
        </div>

        <div className="pt-5">
          <h3 className="text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors duration-300 group-hover:text-primary-600">
            {story.title}
          </h3>
          {story.excerpt && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 line-clamp-2">{story.excerpt}</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Avatar src={story.avatar} name={story.author_name} className="h-9 w-9 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{story.author_name}</p>
              {story.author_info && <p className="truncate text-xs text-slate-500">{story.author_info}</p>}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

const StoryCardSkeleton = () => (
  <div aria-hidden="true">
    <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
    <div className="space-y-2.5 pt-5">
      <div className="h-5 w-4/5 animate-pulse rounded-md bg-slate-100" />
      <div className="h-4 w-full animate-pulse rounded-md bg-slate-100" />
      <div className="flex items-center gap-3 pt-2">
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-32 animate-pulse rounded-md bg-slate-100" />
      </div>
    </div>
  </div>
)

export { StoryCard, StoryCardSkeleton, Avatar }
