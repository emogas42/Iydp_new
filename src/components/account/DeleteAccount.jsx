import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/utils/api'

const DeleteAccount = ({ onDeleted }) => {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.deleteAccount(password)
      onDeleted()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-accent-red"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" /> Hesabı sil
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-accent-red bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-slate-900">Hesabı silmək istəyirsiniz?</h2>
      <p className="mt-2 text-sm text-slate-600">
        Profiliniz, müraciətləriniz, tədbir qeydiyyatlarınız, iştirak tarixçəniz və üzvlük kartınız birdəfəlik silinəcək.
        VIP üzvlüyünüz varsa, o da bitəcək. Bu əməliyyatı geri qaytarmaq olmur.
      </p>
      <p className="mt-2 text-sm text-slate-600">Ödəniş qeydləri uçot üçün adınız olmadan qalır.</p>

      <label htmlFor="delete-password" className="mb-1.5 mt-4 block text-xs font-semibold text-slate-700">Təsdiq üçün şifrəniz</label>
      <input
        id="delete-password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />

      {error && <p role="alert" className="mt-3 text-sm font-medium text-[#c7463a]">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-accent-red px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? 'Silinir...' : 'Hesabımı birdəfəlik sil'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setOpen(false); setPassword(''); setError('') }}
          className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          İmtina
        </button>
      </div>
    </form>
  )
}

export { DeleteAccount }
