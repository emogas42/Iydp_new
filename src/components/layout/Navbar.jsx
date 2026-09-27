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
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100'
          : 'bg-white backdrop-blur-md'
      }`}
    >
      <nav className="max-w-7xl mx-auto lg:px-8 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0">
          <img src="/logo.png" alt="IYDP" className="h-24 w-auto" />
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
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition rounded-lg">
                  {item.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      dropdownOpen === item.label ? 'rotate-180' : ''
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
                      className="absolute top-[calc(100%+12px)] left-0 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 py-2 min-w-[220px]"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className="block px-4 py-2.5 text-sm text-slate-600 hover:text-primary-500 hover:bg-primary-50/50 transition"
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
                  `relative px-4 py-2 text-sm font-medium rounded-lg transition ${
                    isActive
                      ? 'text-primary-500'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary-500 rounded-full"
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </div>

        {/* Desktop CTA + Mobile Toggle */}
        <div className="flex items-center gap-3 lg:ml-4">
          <Link
            to={user ? '/account' : '/login'}
            className={`hidden lg:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition ${
              location.pathname === '/account' || location.pathname === '/login' || location.pathname === '/register'
                ? 'text-primary-500'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {user && <UserCircle className="w-4 h-4" />}
            Hesabım
          </Link>
          <Button to="/contact" size="sm" className="hidden lg:inline-flex" arrow>
            Join Us
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-4  cursor-pointer flex items-center jsutify-center  w-30 h-30 text-slate-700  rounded-lg transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
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
              className="fixed inset-0  z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-[72px] left-0 right-0 bg-white z-50 lg:hidden shadow-xl border-b border-slate-100 max-h-[calc(100vh-72px)] overflow-y-auto"
            >
              <div className="px-5 py-4 space-y-1">
                {navItems.map((item, i) =>
                  item.children ? (
                    <div key={item.label}>
                      <button
                        onClick={() =>
                          setDropdownOpen(
                            dropdownOpen === item.label ? null : item.label
                          )
                        }
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
                      >
                        {item.label}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            dropdownOpen === item.label ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {dropdownOpen === item.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-4 overflow-hidden"
                          >
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                to={child.href}
                                className="block px-4 py-2.5 text-sm text-slate-500 hover:text-primary-500 transition"
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
                        `block px-4 py-3 text-sm font-medium rounded-lg transition ${
                          isActive
                            ? 'text-primary-500 bg-primary-50'
                            : 'text-slate-700 hover:bg-slate-50'
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
                    `flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition ${
                      isActive ? 'text-primary-500 bg-primary-50' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {user && <UserCircle className="w-4 h-4" />}
                  Hesabım
                </NavLink>
                <div className="pt-4 border-t border-slate-100">
                  <Button to="/contact" className="w-full" arrow>
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
