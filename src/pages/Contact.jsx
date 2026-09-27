import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { contactInfo } from '@/data'

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))

      const res = await fetch('/api/contact', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.status === 'success') {
        setSent(true)
        setForm({ name: '', email: '', message: '' })
        setTimeout(() => setSent(false), 4000)
      }
    } catch {
      console.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  const contactDetails = [
    {
      icon: Mail,
      label: 'Email',
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`,
      color: '#00aef6',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: contactInfo.phone,
      href: `tel:${contactInfo.phone.replace(/\s/g, '')}`,
      color: '#7dba4e',
    },
    {
      icon: MapPin,
      label: 'Address',
      value: contactInfo.address,
      color: '#f06e60',
    },
  ]

  return (
    <div className="min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-white via-slate-50 to-primary-50 py-16 lg:py-24 overflow-hidden">
        <Container className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-accent-green text-sm font-semibold mb-3 uppercase tracking-wider">Contact</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">Let's connect</h1>
            <p className="text-slate-500 max-w-xl mx-auto">Reach us for Erasmus+, ESC, partnership and international cooperation inquiries.</p>
          </motion.div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="grid lg:grid-cols-5 gap-14">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {contactDetails.map((item, i) => {
                  const Icon = item.icon
                  const Wrapper = item.href ? 'a' : 'div'
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Wrapper
                        {...(item.href ? { href: item.href } : {})}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition group"
                      >
                        <span
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 font-medium tracking-wider">{item.label}</p>
                          <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                        </div>
                      </Wrapper>
                    </motion.div>
                  )
                })}
              </div>
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
