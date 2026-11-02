import { useState } from 'react'
import { csrfFetch } from '@/utils/csrf'

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'

const EMPTY = { current_password: '', new_password: '', confirm_password: '' }

const ChangePassword = ({ required, onChanged }) => {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const bind = (name) => ({
    id: `password-${name}`,
    type: 'password',
    required: true,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    className: inputClass,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDone(false)
    setSaving(true)
    try {
      const res = await csrfFetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Şifrə dəyişdirilmədi.')
      setForm(EMPTY)
      setDone(true)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Şifrəni dəyiş</h2>
      {required && (
        <p role="alert" className="mt-2 text-sm font-medium text-[#c7463a]">
          Şifrəniz admin tərəfindən sıfırlanıb. Zəhmət olmasa, özünüzə yeni şifrə təyin edin.
        </p>
      )}
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="password-current_password" className="mb-1.5 block text-sm font-medium text-slate-700">
            {required ? 'Müvəqqəti şifrə' : 'Hazırkı şifrə'}
          </label>
          <input {...bind('current_password')} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="password-new_password" className="mb-1.5 block text-sm font-medium text-slate-700">Yeni şifrə</label>
          <input {...bind('new_password')} minLength={8} autoComplete="new-password" placeholder="Ən azı 8 simvol" />
        </div>
        <div>
          <label htmlFor="password-confirm_password" className="mb-1.5 block text-sm font-medium text-slate-700">Yeni şifrə (təkrar)</label>
          <input {...bind('confirm_password')} minLength={8} autoComplete="new-password" />
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[#c7463a]">{error}</p>}
      {done && <p role="status" className="mt-3 text-sm font-medium text-[#4f7f2b]">Şifrəniz dəyişdirildi.</p>}
      <button type="submit" disabled={saving} className="mt-4 h-11 w-full rounded-md bg-primary-600 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
        {saving ? 'Saxlanılır...' : 'Şifrəni dəyiş'}
      </button>
    </form>
  )
}

export { ChangePassword }
