import { HeroSection } from '@/components/sections/HeroSection'
import { StatsSection } from '@/components/sections/StatsSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { ProgramsSection } from '@/components/sections/ProgramsSection'
import { StoriesSection } from '@/components/sections/StoriesSection'
import { NewsSection } from '@/components/sections/NewsSection'
import { FAQSection } from '@/components/sections/FAQSection'
import { PartnersSection } from '@/components/sections/PartnersSection'

const Home = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <ProgramsSection />
      <StoriesSection />
      <NewsSection />
      <PartnersSection />
      <FAQSection />
    </div>
  )
}

export { Home }
