import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const CTASection = () => {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-secondary-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-primary-700 text-sm font-medium">
              Your journey starts here
            </span>
          </div>

          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Ready to make a difference?
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10">
            Join IYDP and become part of an international community of young
            leaders, volunteers, and changemakers shaping the future.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button to="/opportunities" size="lg" arrow>
              Explore programs
            </Button>
            <Button
              to="/contact"
              variant="outline"
              size="lg"
            >
              Get in touch
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { CTASection }
