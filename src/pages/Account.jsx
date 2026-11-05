import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Hourglass } from 'lucide-react'
import { api } from '@/utils/api'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/context/AuthContext'
import { MembershipCard } from '@/components/account/MembershipCard'
import { ChangePassword } from '@/components/account/ChangePassword'
import { VerifyEmailNotice } from '@/components/account/VerifyEmailNotice'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import { formatDate } from '@/utils/format'

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const APPLICATION_STATUS = { pending: 'Baxılır', accepted: 'Qəbul olunub', rejected: 'Seçilməyib' }
const EVENT_STATUS = {
  pending: ['Baxılır', 'text-slate-500'],
  approved: ['Təsdiqlənib', 'text-[#4f7f2b]'],
  rejected: ['Qəbul olunmayıb', 'text-[#c7463a]'],
}

const formatLongDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

const Panel = ({ title, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
    {children}
  </div>
)

const Account = () => {
  const { user, loading, logout, requestVip, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [justVerified, setJustVerified] = useState(false)
  const neededVerifying = useRef(false)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    if (neededVerifying.current && user && !user.email_verification_required) setJustVerified(true)
    neededVerifying.current = Boolean(user?.email_verification_required)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((account) => {
        setData(account)
        // The list keeps its "new" marks until they leave; the navbar count clears now.
        if (account?.notifications?.some((n) => !n.is_read)) {
          api.markNotificationsRead().then(() => refreshUser()).catch(() => {})
        }
      })
      .catch(() => setData(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (deleted) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[72px]">
        <Container narrow className="py-20">
          <div role="status" className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Hesabınız silindi</h1>
            <p className="mt-2 text-slate-600">Məlumatlarınız silindi və hesabdan çıxış etdiniz.</p>
            <Link to="/" className="mt-6 inline-flex rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
              Ana səhifə
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  if (!loading && !user) {
    return <Navigate to="/login" replace state={{ from: '/account' }} />
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleRequestVip = async () => {
    setError('')
    setRequesting(true)
    try {
      await requestVip()
      await refreshUser()
    } catch (err) {
      setError(err.message)
    } finally {
      setRequesting(false)
    }
  }

  const logoutButton = (extra) => (
    <button
      type="button"
      onClick={handleLogout}
      className={`items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-red hover:text-accent-red ${extra}`}
    >
      <LogOut className="h-4 w-4" /> Çıxış
    </button>
  )

  const canRequestVip = user && user.card_type === 'standard' && user.vip_status !== 'pending' && !user.email_verification_required

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px]">
      <Container className="py-12 lg:py-16">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-semibold text-primary-700">Hesabım</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 lg:text-4xl">
              Salam, {user?.full_name || user?.email}
            </h1>
          </div>
          {/* On phones it sits at the end of the page, away from the card. */}
          {logoutButton('hidden shrink-0 md:inline-flex')}
        </div>

        {error && (
          <div role="alert" className="mb-8 max-w-2xl rounded-md border border-accent-red bg-white p-4 text-sm font-medium text-slate-800">
            {error}
          </div>
        )}

        {user?.email_verification_required && (
          <div className="mb-8 max-w-2xl"><VerifyEmailNotice /></div>
        )}
        {justVerified && (
          <p role="status" className="mb-8 max-w-2xl rounded-lg border border-[#4f7f2b]/30 bg-white p-4 text-sm font-medium text-[#4f7f2b]">
            Email təsdiqləndi. İndi tədbir və layihələrə müraciət edə bilərsiniz.
          </p>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <div className="min-w-0 space-y-8 lg:col-span-3">
            {user && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <MembershipCard user={user} />
              </motion.div>
            )}

            {user?.vip_status === 'pending' && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5">
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div>
                  <p className="font-semibold text-slate-900">VIP sorğunuz gözlənilir</p>
                  <p className="mt-1 text-sm text-slate-600">Ödəniş təsdiqlənəndən sonra kartınız VIP karta çevriləcək.</p>
                </div>
              </div>
            )}

            {canRequestVip && (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold text-slate-900">VIP üzv olun</h2>
                  <p className="text-sm font-semibold text-secondary-600">50 AZN / il</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Sorğu göndərdikdən sonra ödənişi ofisimizdə (nağd və ya köçürmə) tamamlayın. Admin təsdiqləyəndən sonra kartınız VIP karta çevriləcək.
                </p>
                <button
                  type="button"
                  onClick={handleRequestVip}
                  disabled={requesting}
                  className="mt-5 h-11 w-full rounded-md bg-secondary-500 text-sm font-semibold text-white transition-colors hover:bg-secondary-600 disabled:opacity-60 sm:w-auto sm:px-6"
                >
                  {requesting ? 'Göndərilir...' : 'VIP üzvlüyə sorğu göndər'}
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-2">
            {data?.notifications?.length > 0 && (
              <Panel title="Bildirişlər">
                <ul className="space-y-4 text-sm">
                  {data.notifications.map((n) => (
                    <li key={n.id}>
                      <p className="flex items-start gap-2 font-semibold text-slate-900">
                        {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-red"><span className="sr-only">Yeni</span></span>}
                        <span className="min-w-0">{n.link ? <Link to={n.link} className="hover:text-primary-700">{n.title}</Link> : n.title}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-line break-words text-slate-600">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatLongDate(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {user && (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">Əlavə məlumatlar</h2>
                  <span className="text-sm font-semibold tabular-nums text-primary-700">{user.profile_progress}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full bg-primary-600" style={{ width: `${user.profile_progress}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {user.profile_complete
                    ? 'Profiliniz tamamlanıb. İstədiyiniz vaxt yeniləyə bilərsiniz.'
                    : 'Təhsil, təcrübə və dil biliklərinizi doldurun. Bəzi layihələrə müraciət üçün bu tələb olunur.'}
                </p>
                <Link to="/account/profile" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
                  {user.profile_complete ? 'Profilə bax' : 'Profili doldur'}
                </Link>
              </div>
            )}

            <Panel title="Profil məlumatları">
              <dl className="space-y-3 text-sm">
                {[['Email', user?.email], ['Telefon', user?.phone || '—'], ['Qeydiyyat', formatLongDate(user?.created_at) || '—']].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            {user?.must_change_password && <ChangePassword required onChanged={refreshUser} />}

            {data?.event_registrations?.length > 0 && (
              <Panel title="Tədbirlərim">
                <ul className="space-y-3 text-sm">
                  {data.event_registrations.map((r) => (
                    <li key={r.id} className="flex justify-between gap-4">
                      <span className="min-w-0">
                        <Link to={`/events/${r.event_id}`} className="block font-medium text-slate-800 hover:text-primary-700">{r.event_name}</Link>
                        <span className="text-xs text-slate-500">{formatDate(r.starts_at)}</span>
                      </span>
                      <span className={`shrink-0 font-medium ${EVENT_STATUS[r.status]?.[1] || 'text-slate-500'}`}>{EVENT_STATUS[r.status]?.[0] || r.status}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {data?.applications?.length > 0 && (
              <Panel title="Müraciətlərim">
                <ul className="space-y-3 text-sm">
                  {data.applications.map((a) => (
                    <li key={a.id} className="flex justify-between gap-4">
                      <Link to={`/projects/${a.project_id}`} className="min-w-0 font-medium text-slate-800 hover:text-primary-700">{a.project_title}</Link>
                      <span className="shrink-0 text-slate-500">{APPLICATION_STATUS[a.status] || a.status}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {data?.attendances?.length > 0 && (
              <Panel title="Son iştirakım">
                <ul className="space-y-3 text-sm">
                  {data.attendances.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex justify-between gap-4">
                      <span className="min-w-0 font-medium text-slate-800">{a.event_name}</span>
                      <span className="shrink-0 text-slate-500">{formatLongDate(a.checked_in_at)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>

        {user && !user.must_change_password && (
          <div className="mt-6 max-w-md lg:ml-auto">
            <ChangePassword onChanged={refreshUser} />
          </div>
        )}

        {user && !user.is_admin && (
          <div className="mt-10 max-w-md lg:ml-auto">
            <DeleteAccount onDeleted={() => { setDeleted(true); refreshUser() }} />
          </div>
        )}

        {logoutButton('mt-12 inline-flex w-full md:hidden')}
      </Container>
    </div>
  )
}

export { Account }
