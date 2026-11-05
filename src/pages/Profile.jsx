import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/utils/api'

// 16px on phones: iOS Safari zooms the page when a smaller input gets focus.
const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-500 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-[15px]'

const EMPTY_ROWS = {
  education: { institution: '', level: '', field: '', start_year: '', end_year: '' },
  experience: { kind: '', organization: '', role: '', start_year: '', end_year: '', description: '' },
  languages: { language: '', level: '' },
}

const Field = ({ label, optional, children }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-slate-700">
      {label}
      {optional && <span className="ml-auto text-xs font-normal text-slate-500">İstəyə bağlı</span>}
    </span>
    {children}
  </label>
)

const Select = ({ options, placeholder = 'Seçin', ...props }) => (
  <select {...props} className={inputClass}>
    <option value="">{placeholder}</option>
    {Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>
)

const Section = ({ title, hint, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    <div className="mt-5">{children}</div>
  </section>
)

const YearFields = ({ row, onChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <Field label="Başlama ili">
      <input type="number" inputMode="numeric" min="1950" max="2100" value={row.start_year} onChange={(e) => onChange('start_year', e.target.value)} className={inputClass} />
    </Field>
    <Field label="Bitmə ili">
      <input type="number" inputMode="numeric" min="1950" max="2100" value={row.end_year} onChange={(e) => onChange('end_year', e.target.value)} placeholder="Davam edir" className={inputClass} />
    </Field>
  </div>
)

const Rows = ({ rows, addLabel, onAdd, onRemove, render }) => (
  <div className="space-y-4">
    {rows.map((row, index) => (
      <div key={row.key} className="rounded-md border border-slate-200 p-4">
        <div className="space-y-4">{render(row, index)}</div>
        <button type="button" onClick={() => onRemove(index)} className="mt-3 inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-accent-red">
          <Trash2 className="h-4 w-4" /> Sil
        </button>
      </div>
    ))}
    <button type="button" onClick={onAdd} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto sm:px-5">
      <Plus className="h-4 w-4" /> {addLabel}
    </button>
  </div>
)

const Profile = () => {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState(null)
  const [options, setOptions] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const nextKey = useRef(0)
  const loggedIn = Boolean(user)
  const returnTo = location.state?.from

  const withKeys = (profile) => {
    const keyed = (rows) => rows.map((row) => ({ ...row, key: nextKey.current++ }))
    return { ...profile, education: keyed(profile.education), experience: keyed(profile.experience), languages: keyed(profile.languages) }
  }

  useEffect(() => {
    if (!loggedIn) return
    api.getProfile()
      .then((data) => {
        setOptions(data.options)
        setForm(withKeys(data.profile))
      })
      .catch(() => setLoadFailed(true))
  }, [loggedIn])

  if (!authLoading && !user) {
    return <Navigate to="/login" replace state={{ from: '/account/profile' }} />
  }

  const set = (name, value) => {
    setSaved(false)
    setError('')
    setForm((f) => ({ ...f, [name]: value }))
  }
  const bind = (name) => ({ value: form[name], onChange: (e) => set(name, e.target.value) })
  const setRow = (section, index, name, value) =>
    set(section, form[section].map((row, i) => (i === index ? { ...row, [name]: value } : row)))
  const addRow = (section) => set(section, [...form[section], { ...EMPTY_ROWS[section], key: nextKey.current++ }])
  const removeRow = (section, index) => set(section, form[section].filter((_, i) => i !== index))
  const toggleInterest = (interest) =>
    set('interests', form.interests.includes(interest) ? form.interests.filter((i) => i !== interest) : [...form.interests, interest])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const data = await api.saveProfile(form)
      setForm(withKeys(data.profile))
      await refreshUser()
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const progress = user?.profile_progress ?? 0

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px]">
      <Container className="py-10 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <Link to="/account" className="inline-flex h-10 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary-700">
            <ArrowLeft className="h-4 w-4" /> Hesabım
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-4xl">Əlavə məlumatlar</h1>
          <p className="mt-2 text-slate-600">Layihələrə uyğun iştirakçıları seçmək üçün bizə kömək edir. İstədiyiniz vaxt yarımçıq saxlayıb sonra davam edə bilərsiniz. Bu məlumatları yalnız IYDP administratorları görür.</p>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-semibold tabular-nums text-primary-700">{progress}%</span>
          </div>

          {loadFailed && <p role="alert" className="mt-8 rounded-md border border-accent-red bg-white p-4 text-sm font-medium text-slate-800">Məlumatlar yüklənmədi. Səhifəni yeniləyin.</p>}
          {!form && !loadFailed && <div className="mt-8 h-64 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />}

          {form && options && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Section title="Şəxsi məlumatlar">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Doğum tarixi"><input type="date" autoComplete="bday" {...bind('birth_date')} className={inputClass} /></Field>
                  <Field label="Cinsiyyət" optional><Select options={options.genders} {...bind('gender')} /></Field>
                  <Field label="Vətəndaşlıq"><input maxLength={100} {...bind('citizenship')} className={inputClass} /></Field>
                  <Field label="Yaşadığınız şəhər və ölkə"><input maxLength={150} placeholder="məs. Bakı, Azərbaycan" {...bind('residence')} className={inputClass} /></Field>
                  <Field label="Məşğuliyyət"><Select options={options.occupations} {...bind('occupation')} /></Field>
                </div>
              </Section>

              <Section title="Təhsil" hint="Ən azı birini əlavə edin.">
                <Rows
                  rows={form.education}
                  addLabel="Təhsil əlavə et"
                  onAdd={() => addRow('education')}
                  onRemove={(i) => removeRow('education', i)}
                  render={(row, i) => (
                    <>
                      <Field label="Müəssisə"><input maxLength={200} value={row.institution} onChange={(e) => setRow('education', i, 'institution', e.target.value)} className={inputClass} /></Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Səviyyə"><Select options={options.education_levels} value={row.level} onChange={(e) => setRow('education', i, 'level', e.target.value)} /></Field>
                        <Field label="İxtisas" optional><input maxLength={150} value={row.field} onChange={(e) => setRow('education', i, 'field', e.target.value)} className={inputClass} /></Field>
                      </div>
                      <YearFields row={row} onChange={(name, value) => setRow('education', i, name, value)} />
                    </>
                  )}
                />
              </Section>

              <Section title="Təcrübə" hint="İş, könüllülük, təcrübə proqramı və ya layihələr. Hələ yoxdursa, boş saxlayın.">
                <Rows
                  rows={form.experience}
                  addLabel="Təcrübə əlavə et"
                  onAdd={() => addRow('experience')}
                  onRemove={(i) => removeRow('experience', i)}
                  render={(row, i) => (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Növ"><Select options={options.experience_kinds} value={row.kind} onChange={(e) => setRow('experience', i, 'kind', e.target.value)} /></Field>
                        <Field label="Təşkilat"><input maxLength={200} value={row.organization} onChange={(e) => setRow('experience', i, 'organization', e.target.value)} className={inputClass} /></Field>
                      </div>
                      <Field label="Vəzifə və ya rol" optional><input maxLength={150} value={row.role} onChange={(e) => setRow('experience', i, 'role', e.target.value)} className={inputClass} /></Field>
                      <YearFields row={row} onChange={(name, value) => setRow('experience', i, name, value)} />
                      <Field label="Nə ilə məşğul olmusunuz?" optional><textarea rows={3} maxLength={2000} value={row.description} onChange={(e) => setRow('experience', i, 'description', e.target.value)} className={`${inputClass} resize-y`} /></Field>
                    </>
                  )}
                />
              </Section>

              <Section title="Dillər" hint="Ən azı birini əlavə edin.">
                <Rows
                  rows={form.languages}
                  addLabel="Dil əlavə et"
                  onAdd={() => addRow('languages')}
                  onRemove={(i) => removeRow('languages', i)}
                  render={(row, i) => (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Dil"><input maxLength={60} value={row.language} onChange={(e) => setRow('languages', i, 'language', e.target.value)} className={inputClass} /></Field>
                      <Field label="Səviyyə"><Select options={options.language_levels} value={row.level} onChange={(e) => setRow('languages', i, 'level', e.target.value)} /></Field>
                    </div>
                  )}
                />
              </Section>

              <Section title="Bacarıq və maraqlar">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">Maraq sahələri</legend>
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    {Object.entries(options.interests).map(([value, label]) => (
                      <label key={value} className="flex min-h-11 items-center gap-3 text-[15px] text-slate-800">
                        <input type="checkbox" checked={form.interests.includes(value)} onChange={() => toggleInterest(value)} className="h-5 w-5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-5 space-y-4">
                  <Field label="Bacarıqlar" optional><textarea rows={3} maxLength={2000} placeholder="məs. fotoqrafiya, tədbir təşkili, Excel" {...bind('skills')} className={`${inputClass} resize-y`} /></Field>
                  <Field label="Əvvəl iştirak etdiyiniz proqramlar" optional><textarea rows={3} maxLength={2000} placeholder="məs. Erasmus+ gənclər mübadiləsi, Portuqaliya, 2024" {...bind('past_programmes')} className={`${inputClass} resize-y`} /></Field>
                  <Field label="Özünüz haqqında" optional><textarea rows={4} maxLength={3000} {...bind('about')} className={`${inputClass} resize-y`} /></Field>
                </div>
              </Section>

              <Section title="Linklər">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="CV linki" optional><input type="url" inputMode="url" maxLength={500} placeholder="https://" {...bind('cv_link')} className={inputClass} /></Field>
                  <Field label="LinkedIn" optional><input type="url" inputMode="url" maxLength={500} placeholder="https://" {...bind('linkedin')} className={inputClass} /></Field>
                </div>
              </Section>

              {error && <p role="alert" className="rounded-md border border-accent-red bg-white p-4 text-sm font-medium text-slate-800">{error}</p>}
              {saved && (
                <p role="status" className="rounded-md border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">
                  Məlumatlarınız saxlanıldı.
                  {returnTo && user?.profile_complete && <> <Link to={returnTo} className="font-semibold text-primary-700 underline underline-offset-4">Müraciətə qayıt</Link></>}
                </p>
              )}

              <button type="submit" disabled={saving} className="h-12 w-full rounded-md bg-primary-600 px-8 font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto">
                {saving ? 'Saxlanılır...' : 'Yadda saxla'}
              </button>
            </form>
          )}
        </div>
      </Container>
    </div>
  )
}

export { Profile }
