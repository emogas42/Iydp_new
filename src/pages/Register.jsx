import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/context/AuthContext'

const Register = () => {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/account" replace />
  }

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/account', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pt-[72px] bg-gradient-to-br from-white via-slate-50 to-primary-50">
      <Container narrow className="py-16 lg:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-primary-500 text-sm font-semibold mb-3 uppercase tracking-wider">Hesabım</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">Qeydiyyatdan keç</h1>
          <p className="text-slate-500 max-w-md mx-auto">Pulsuz hesab yaradın, VIP üzvlüyə buradan müraciət edin.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100 p-8 md:p-10 max-w-lg mx-auto"
        >
          {error && (
            <div className="mb-6 rounded-xl p-4 text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Ad Soyad</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={handleChange('full_name')}
                placeholder="Elmeddin Məmmədov"
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="siz@example.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+994 XX XXX XX XX"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Şifrə</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Ən azı 6 simvol"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Şifrə (təkrar)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.confirm_password}
                  onChange={handleChange('confirm_password')}
                  placeholder="Şifrəni təkrarlayın"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-primary-500 transition text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Yaradılır...' : (<>Hesab yarat <UserPlus className="w-4 h-4" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 font-medium mt-8">
            Artıq hesabınız var?{' '}
            <Link to="/login" className="text-primary-500 font-semibold hover:underline">
              Daxil olun
            </Link>
          </p>
        </motion.div>
      </Container>
    </div>
  )
}

export { Register }
