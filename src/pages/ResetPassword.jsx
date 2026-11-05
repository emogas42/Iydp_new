import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

const INPUT = 'w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 px-4 py-3 rounded-xl outline-none transition text-sm'
const BUTTON = 'mt-6 inline-flex rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700'

const FAILURES = {
  expired: ['Linkin vaxtı bitib', 'Linklər 1 saat işləyir. Yeni link istəyin.'],
  invalid: ['Link işləmir', 'Bu link düzgün deyil və ya artıq istifadə olunub. Yeni link istəyin.'],
}

// The password changes only when the form is sent, so mail scanners that fetch links
// can't use one up.
const ResetPassword = () => {
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(token ? 'form' : 'invalid')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.resetPassword({ token, ...form })
      // The old session ended with the old password.
      await refreshUser()
      setStatus('done')
    } catch (err) {
      if (FAILURES[err.code]) setStatus(err.code)
      else setError(err.status === 429 ? 'Çox cəhd oldu. Bir az sonra yenidən yoxlayın.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const failure = FAILURES[status]

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px]">
      <Container narrow className="py-16 lg:py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100 md:p-10" aria-live="polite">
          {status === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Yeni şifrə</h1>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
                )}
                <div>
                  <label htmlFor="reset-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Yeni şifrə</label>
                  <input
                    id="reset-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Ən azı 8 simvol"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="mb-1.5 block text-xs font-semibold text-slate-700">Yeni şifrə (təkrar)</label>
                  <input
                    id="reset-confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60">
                  {saving ? 'Saxlanılır...' : 'Şifrəni saxla'}
                </button>
              </form>
            </>
          )}

          {status === 'done' && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#4f7f2b]" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Şifrəniz dəyişdirildi</h1>
              <p className="mt-2 text-slate-600">İndi yeni şifrə ilə daxil ola bilərsiniz.</p>
              <Link to="/login" className={BUTTON}>Daxil ol</Link>
            </div>
          )}

          {failure && (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-[#c7463a]" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">{failure[0]}</h1>
              <p className="mt-2 text-slate-600">{failure[1]}</p>
              <Link to="/forgot-password" className={BUTTON}>Yeni link istə</Link>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export { ResetPassword }
