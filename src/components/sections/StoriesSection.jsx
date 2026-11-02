import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { StoryCard } from '@/components/stories/StoryCard'
import { api } from '@/utils/api'

const StoriesSection = () => {
  const [stories, setStories] = useState([])

  useEffect(() => {
    let cancelled = false
    api.getStories('page=1')
      .then((data) => { if (!cancelled) setStories((data.items || []).slice(0, 3)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Nothing to show until admins publish the first story.
  if (stories.length === 0) return null

  return (
    <section id="stories" className="overflow-hidden bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          badge="Real experiences"
          badgeColor="accent-red"
          title="Stories from our"
          highlightedText="community"
          description="Participants of Erasmus+, ESC and other projects share what the experience meant to them."
          center
        />

        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story, i) => (
            <StoryCard key={story.id} story={story} index={i} animateOnView />
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button to="/stories" variant="outline" arrow>
            Read all stories
          </Button>
        </div>
      </div>
    </section>
  )
}

export { StoriesSection }
