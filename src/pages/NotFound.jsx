import { motion } from 'framer-motion'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'

const NotFound = () => {
  return (
    <div className="min-h-screen pt-[72px] flex items-center">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg mx-auto py-20"
        >
          {/* 404 Number */}
          <div className="relative mb-8">
            <span className="text-[160px] lg:text-[200px] font-black text-slate-100 leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Search className="w-10 h-10 text-primary-500" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-slate-500 leading-relaxed mb-8">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-all duration-300 shadow-lg shadow-primary-500/20"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold text-sm hover:border-primary-500 hover:text-primary-500 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}

export { NotFound }
