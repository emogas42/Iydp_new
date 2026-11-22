import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, MessageCircle, ExternalLink } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { contactInfo } from '@/data'
import { csrfFetch } from '@/utils/csrf'

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('email', form.email)
    formData.append('message', form.message)

    try {
      const res = await csrfFetch('/api/contact', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setSent(true)
        setForm({ name: '', email: '', message: '' })
        setTimeout(() => setSent(false), 5000)
      }
    } catch {
      console.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  const cleanPhone = contactInfo.phone.replace(/\s/g, '')

  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <Container className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-accent-green text-sm font-semibold mb-3 uppercase tracking-wider">Contact</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">Let's connect</h1>
            <p className="text-slate-500 max-w-xl mx-auto">
              Reach us for Erasmus+, ESC, partnership and international cooperation inquiries.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="grid lg:grid-cols-5 gap-14">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Email Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Email</p>
                      <a
                        href={`mailto:${contactInfo.email}?subject=IYDP%20M%C3%BCraci%C9%99t%20/%20Sual`}
                        className="text-base font-bold text-slate-900 hover:text-primary-500 transition-colors"
                        title="E-poçt proqramında aç"
                      >
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`mailto:${contactInfo.email}?subject=IYDP%20M%C3%BCraci%C9%99t%20/%20Sual`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-white text-xs font-semibold transition-all"
                  >
                    E-poçt göndər
                  </a>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contactInfo.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                    title="Gmail veb tətbiqində birbaşa aç"
                  >
                    <span>Gmail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>

              {/* Phone & WhatsApp Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Telefon</p>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors"
                        title="Zəng et"
                      >
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Zəng et</span>
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhone.replace('+', '')}?text=Salam,%20IYDP%20haqqında%20məlumat%20almaq%20istəyirəm`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </motion.div>

              {/* Address Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Ünvan</p>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{contactInfo.address}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="bg-slate-50 rounded-2xl p-6 md:p-10 border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-white border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full bg-white border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Message</label>
                    <textarea
                      rows={5}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help?"
                      className="w-full bg-white border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-primary-500 transition text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {sending ? (
                      <>Sending... <Loader2 className="w-4 h-4 animate-spin" /></>
                    ) : sent ? (
                      <>Sent! <CheckCircle className="w-4 h-4" /></>
                    ) : (
                      <>Send message <Send className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>
    </div>
  )
}

export { Contact }
