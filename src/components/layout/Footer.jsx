import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, ArrowRight, Facebook, Instagram, Linkedin } from 'lucide-react'
import { socialLinks, contactInfo } from '@/data'

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 relative overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Newsletter */}
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1 text-slate-900">Stay in the loop</h3>
              <p className="text-slate-500 text-sm">
                Get updates about new programs, opportunities, and events.
              </p>
            </div>
            <div className="flex w-full max-w-md">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 bg-white border border-slate-200 rounded-l-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 transition"
              />
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-r-xl text-sm font-semibold transition-all flex items-center gap-2">
                Subscribe <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="IYDP" className="h-28 w-auto" />
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              Empowering youth through international collaboration, Erasmus+
              programs, and cross-cultural experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-700 mb-4">
              Quick Links
            </h4>
            <div className="space-y-2.5">
              {[
                { label: 'About Us', to: '/#about' },
                { label: 'Opportunities', to: '/opportunities' },
                { label: 'News', to: '/news' },
                { label: 'Stories', to: '/stories' },
                { label: 'FAQ', to: '/faq' },
                { label: 'Contact', to: '/contact' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-slate-500 text-sm hover:text-primary-500 transition"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-700 mb-4">
              Contact
            </h4>
            <div className="space-y-3">
              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-start gap-3 text-slate-500 text-sm hover:text-primary-500 transition"
              >
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                {contactInfo.email}
              </a>
              <a
                href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                className="flex items-start gap-3 text-slate-500 text-sm hover:text-primary-500 transition"
              >
                <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                {contactInfo.phone}
              </a>
              <div className="flex items-start gap-3 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                {contactInfo.address}
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-700 mb-4">
              Follow Us
            </h4>
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const iconMap = { Facebook, Instagram, LinkedIn: Linkedin }
                const Icon = iconMap[link.platform]
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all"
                    aria-label={link.platform}
                  >
                    {Icon ? <Icon className="w-4.5 h-4.5" /> : link.platform[0]}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} International Youth Dialogue Platform.
            All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <img src="/logo.png" alt="IYDP" className="h-5 w-auto opacity-40" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export { Footer }
