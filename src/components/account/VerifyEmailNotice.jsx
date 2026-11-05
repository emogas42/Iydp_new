import { useEffect, useState } from 'react'
import { MailCheck } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100'

const VerifyEmailNotice = () => {
  const { user, refreshUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  // The link is usually opened in another tab: catch up when this one comes back.
  useEffect(() => {
    window.addEventListener('focus', refreshUser)
    return () => window.removeEventListener('focus', refreshUser)
  }, [refreshUser])

  const run = async (action, done) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await action()
      await refreshUser()
      done(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resend = () => run(api.resendVerification, () => setMessage('Link göndərildi. Spam qovluğunu da yoxlayın.'))

  const changeEmail = (e) => {
    e.preventDefault()
    run(() => api.changeEmail(form), () => {
      setEditing(false)
      setForm({ email: '', password: '' })
      setMessage('Email dəyişdirildi və yeni link göndərildi.')
    })
  }

  return (
    <div className="rounded-lg border border-primary-300 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Email ünvanınızı təsdiqləyin</p>
          <p className="mt-1 break-words text-sm text-slate-600">
            {user.verification_sent_at
              ? <>Təsdiq linkini <strong className="font-semibold text-slate-800">{user.email}</strong> ünvanına göndərdik. Məktubu görmürsünüzsə, <strong className="font-semibold text-slate-800">Spam</strong> qovluğuna baxın. </>
              : <><strong className="font-semibold text-slate-800">{user.email || 'Email ünvanınız'}</strong> hələ təsdiqlənməyib. </>}
            Təsdiqdən sonra tədbir və layihələrə müraciət edə biləcəksiniz.
          </p>

          {message && <p role="status" className="mt-3 text-sm font-medium text-[#4f7f2b]">{message}</p>}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-[#c7463a]">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {user.verification_sent_at ? 'Linki yenidən göndər' : 'Link göndər'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              aria-expanded={editing}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Email səhvdir
            </button>
          </div>

          {editing && (
            <form onSubmit={changeEmail} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label htmlFor="new-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Düzgün email</label>
                <input id="new-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="email-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Şifrəniz</label>
                <input id="email-password" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
              </div>
              <button type="submit" disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
                Dəyiş və link göndər
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export { VerifyEmailNotice }
