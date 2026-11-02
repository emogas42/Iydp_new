import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { api } from '@/utils/api'

const ProgramsSection = () => {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    let cancelled = false
    api.getProjects('phase=present')
      .then((data) => { if (!cancelled) setProjects((data.items || []).slice(0, 3)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (projects.length === 0) return null

  return (
    <section id="programs" className="section-padding bg-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader badge="Projects" badgeColor="primary" title="Present Projects" center />
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} animateOnView />
          ))}
        </div>
        <div className="mt-14 text-center">
          <Button to="/projects" variant="outline" arrow>All projects</Button>
        </div>
      </div>
    </section>
  )
}

export { ProgramsSection }
