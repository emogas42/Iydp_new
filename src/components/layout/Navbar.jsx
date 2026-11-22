import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, UserCircle } from 'lucide-react'
import { navItems } from '@/data'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(null)
  }, [location])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-2xl shadow-lg shadow-slate-900/5 border-b border-slate-200/80'
          : 'bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm'
      }`}
      style={{
        backgroundImage: scrolled
          ? `
            radial-gradient(circle 340px at 6% -10%, rgba(0, 174, 246, 0.16), transparent 70%),
            radial-gradient(circle 360px at 40% -10%, rgba(111, 61, 144, 0.12), transparent 70%),
            radial-gradient(circle 340px at 70% -10%, rgba(240, 110, 96, 0.10), transparent 70%),
            radial-gradient(circle 360px at 95% -10%, rgba(125, 186, 78, 0.16), transparent 70%)
          `
          : `
            radial-gradient(circle 380px at 6% -10%, rgba(0, 174, 246, 0.22), transparent 70%),
            radial-gradient(circle 400px at 40% -10%, rgba(111, 61, 144, 0.15), transparent 70%),
            radial-gradient(circle 380px at 70% -10%, rgba(240, 110, 96, 0.13), transparent 70%),
            radial-gradient(circle 400px at 95% -10%, rgba(125, 186, 78, 0.22), transparent 70%)
          `,
      }}
    >
      {/* Multi-color Brand Spectrum Bar inspired by IYDP Logo */}
      <div className="h-[3.5px] w-full bg-gradient-to-r from-[#00aef6] via-[#6f3d90] via-[#f06e60] to-[#7dba4e]" />

      {/* Frosted Ambient Aurora Glow Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Soft Blue aura behind logo */}
        <div className="absolute -top-10 left-2 sm:left-10 w-60 h-28 bg-[#00aef6]/15 rounded-full blur-3xl" />
        {/* Soft Purple aura in center-left */}
        <div className="absolute -top-10 left-1/3 w-64 h-28 bg-[#6f3d90]/12 rounded-full blur-3xl" />
        {/* Soft Coral aura in center-right */}
        <div className="absolute -top-10 left-2/3 w-56 h-28 bg-[#f06e60]/10 rounded-full blur-3xl" />
        {/* Soft Green aura on the right */}
        <div className="absolute -top-10 right-4 sm:right-12 w-60 h-28 bg-[#7dba4e]/15 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Logo with proper vertical balance */}
        <Link to="/" className="flex items-center shrink-0 group">
          <img
            src="/logo.png"
            alt="IYDP"
            className="h-14 sm:h-16 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1 ml-auto">
          {navItems.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setDropdownOpen(item.label)}
                onMouseLeave={() => setDropdownOpen(null)}
              >
                <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors rounded-lg hover:bg-white/60">
                  {item.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${
                      dropdownOpen === item.label ? 'rotate-180 text-primary-500' : ''
                    }`}
                  />
                </button>
                {/* Bridge element */}
                <div className="absolute top-full left-0 right-0 h-3" />
                <AnimatePresence>
                  {dropdownOpen === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-[calc(100%+8px)] left-0 bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-2xl shadow-xl shadow-slate-900/10 py-2.5 min-w-[230px] overflow-hidden"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className="block px-4 py-2.5 text-sm text-slate-600 hover:text-primary-500 hover:bg-primary-50/70 transition-colors font-medium"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.href}
                className={({ isActive }) =>
                  `relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary-500'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-[#00aef6] via-[#6f3d90] to-[#00aef6] rounded-full"
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </div>

        {/* Desktop CTA + Mobile Toggle */}
        <div className="flex items-center gap-3 lg:ml-5">
          <Link
            to={user ? '/account' : '/login'}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              location.pathname === '/account' ||
              location.pathname === '/login' ||
              location.pathname === '/register'
                ? 'text-primary-500 bg-primary-50/80'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {user && <UserCircle className="w-4 h-4 text-primary-500" />}
            Hesabım
          </Link>

          <Button
            to="/contact"
            size="sm"
            className="hidden lg:inline-flex font-bold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 transition-all"
            arrow
          >
            Join Us
          </Button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2.5 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white/70 rounded-xl transition active:scale-95"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-[75px] left-0 right-0 bg-white/95 backdrop-blur-2xl z-50 lg:hidden shadow-2xl border-b border-slate-200/80 max-h-[calc(100vh-75px)] overflow-y-auto"
            >
              <div className="px-5 py-5 space-y-1">
                {navItems.map((item) =>
                  item.children ? (
                    <div key={item.label}>
                      <button
                        onClick={() =>
                          setDropdownOpen(
                            dropdownOpen === item.label ? null : item.label
                          )
                        }
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-slate-800 rounded-xl hover:bg-slate-100/80 transition"
                      >
                        {item.label}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform text-slate-400 ${
                            dropdownOpen === item.label ? 'rotate-180 text-primary-500' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {dropdownOpen === item.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-4 pr-2 space-y-1 overflow-hidden"
                          >
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                to={child.href}
                                className="block px-4 py-2.5 text-sm text-slate-600 hover:text-primary-500 hover:bg-primary-50/60 rounded-lg transition font-medium"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <NavLink
                      key={item.label}
                      to={item.href}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm font-semibold rounded-xl transition ${
                          isActive
                            ? 'text-primary-500 bg-primary-50'
                            : 'text-slate-800 hover:bg-slate-100/80'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  )
                )}

                <NavLink
                  to={user ? '/account' : '/login'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                      isActive ? 'text-primary-500 bg-primary-50' : 'text-slate-800 hover:bg-slate-100/80'
                    }`
                  }
                >
                  {user && <UserCircle className="w-4 h-4 text-primary-500" />}
                  Hesabım
                </NavLink>

                <div className="pt-4 border-t border-slate-100">
                  <Button to="/contact" className="w-full font-bold py-3" arrow>
                    Join Us
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

export { Navbar }
