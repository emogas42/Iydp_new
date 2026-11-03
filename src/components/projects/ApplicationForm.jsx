import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

const MIN_MOTIVATION = 30
const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'

const Field = ({ id, label, optional, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-sm font-semibold text-slate-800">
      {label}
      {optional && <span className="ml-auto text-xs font-normal text-slate-400">Optional</span>}
    </label>
    {children}
  </div>
)

const ApplicationForm = ({ projectId, user, onSubmitted }) => {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    birth_date: '',
    residence: '',
    english_level: '',
    motivation: '',
    cv_link: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Saves retyping what the profile already has; anything typed meanwhile wins.
  useEffect(() => {
    let cancelled = false
    api.getProfile()
      .then(({ profile }) => {
        if (cancelled) return
        setForm((f) => ({
          ...f,
          birth_date: f.birth_date || profile.birth_date,
          residence: f.residence || profile.residence,
          cv_link: f.cv_link || profile.cv_link,
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const bind = (name) => ({
    id: `apply-${name}`,
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    className: inputClass,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await api.applyToProject(projectId, form)
      onSubmitted(data.my_application)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="apply-full_name" label="Full name">
          <input {...bind('full_name')} required maxLength={150} autoComplete="name" />
        </Field>
        <Field id="apply-email" label="Email">
          <input {...bind('email')} type="email" required maxLength={150} autoComplete="email" />
        </Field>
        <Field id="apply-phone" label="Phone">
          <input {...bind('phone')} type="tel" required maxLength={30} autoComplete="tel" />
        </Field>
        <Field id="apply-birth_date" label="Date of birth">
          <input {...bind('birth_date')} type="date" required autoComplete="bday" />
        </Field>
        <Field id="apply-residence" label="City and country you live in">
          <input {...bind('residence')} required maxLength={150} placeholder="e.g. Baku, Azerbaijan" />
        </Field>
        <Field id="apply-english_level" label="English level">
          <select {...bind('english_level')} required>
            <option value="" disabled>Choose</option>
            {['Basic', 'Intermediate', 'Advanced', 'Fluent'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <Field id="apply-motivation" label="Why do you want to join this project?">
        <textarea {...bind('motivation')} required rows={7} minLength={MIN_MOTIVATION} maxLength={5000} className={`${inputClass} resize-y leading-relaxed`} />
      </Field>

      <Field id="apply-cv_link" label="Link to your CV" optional>
        <input {...bind('cv_link')} type="url" inputMode="url" maxLength={500} placeholder="https://" />
      </Field>

      {error && <p role="alert" className="rounded-md border border-[#f06e60] bg-[#fdeeec] px-4 py-3 text-sm text-[#a33a2f]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-md bg-primary-600 px-8 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? 'Sending…' : 'Send application'}
      </button>
    </form>
  )
}

export { ApplicationForm }
