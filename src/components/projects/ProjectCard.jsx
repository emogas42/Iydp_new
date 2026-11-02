import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImageOff, MapPin } from 'lucide-react'
import { formatDate, formatRange } from '@/utils/format'

const EASE = [0.22, 1, 0.36, 1]

const applicationLine = (project) => {
  if (project.phase === 'finished') return null
  if (project.applications_open) return project.deadline ? `Apply by ${formatDate(project.deadline)}` : 'Applications open'
  return project.accepts_applications ? 'Applications closed' : null
}

const ProjectCard = ({ project, index = 0, animateOnView = false }) => {
  const motionProps = animateOnView
    ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' } }
    : { animate: { opacity: 1, y: 0 } }
  const line = applicationLine(project)
  const dates = formatRange(project.start_date, project.end_date)

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      {...motionProps}
      transition={{ duration: 0.6, ease: EASE, delay: (index % 9) * 0.06 }}
    >
      <Link to={`/projects/${project.id}`} className="group block rounded-lg focus-visible:ring-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-100">
          {project.poster ? (
            <img
              src={project.poster}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageOff className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
        </div>
        <div className="pt-4">
          {project.tags?.[0] && <p className="text-sm font-medium text-primary-700">{project.tags[0]}</p>}
          <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-800 line-clamp-2 transition-colors duration-300 group-hover:text-primary-700">
            {project.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.location}</span>
          </p>
          {dates && <p className="mt-1 text-sm text-slate-500">{dates}</p>}
          {line && (
            <p className={`mt-2 text-sm font-medium ${project.applications_open ? 'text-[#4f7f2b]' : 'text-slate-500'}`}>{line}</p>
          )}
        </div>
      </Link>
    </motion.article>
  )
}

export { ProjectCard }
