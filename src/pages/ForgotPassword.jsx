import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'

const INPUT = 'w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.status === 429 ? 'Çox cəhd oldu. Bir az sonra yenidən yoxlayın.' : err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen pt-[72px] bg-gradient-to-br from-white via-slate-50 to-primary-50">
      <Container narrow className="py-16 lg:py-24">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">Şifrəni unutmusunuz?</h1>
          {!sent && <p className="mx-auto mt-3 max-w-md text-slate-500">Hesabınızın email ünvanını yazın, yeni şifrə üçün link göndərək.</p>}
        </div>

        <div className="mx-auto max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100 md:p-10">
          {sent ? (
            <div role="status">
              <h2 className="font-semibold text-slate-900">Email ünvanınızı yoxlayın</h2>
              <p className="mt-2 text-sm text-slate-600">
                <span className="break-all font-medium">{email}</span> ilə hesab varsa, ora link göndərdik. Link 1 saat işləyir.
              </p>
              <p className="mt-2 text-sm text-slate-600">Məktub bir neçə dəqiqəyə gəlməsə, Spam qovluğuna baxın.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
              )}
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@example.com"
                  className={INPUT}
                />
              </div>
              <button type="submit" disabled={sending} className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60">
                {sending ? 'Göndərilir...' : 'Link göndər'}
              </button>
            </form>
          )}
          <p className="mt-8 text-center text-sm">
            <Link to="/login" className="font-semibold text-primary-500 hover:underline">Girişə qayıt</Link>
          </p>
        </div>
      </Container>
    </div>
  )
}

export { ForgotPassword }
