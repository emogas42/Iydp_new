import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Hourglass } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/context/AuthContext'
import { MembershipCard } from '@/components/account/MembershipCard'
import { ChangePassword } from '@/components/account/ChangePassword'
import { formatDate } from '@/utils/format'

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const APPLICATION_STATUS = { pending: 'Baxılır', accepted: 'Qəbul olunub', rejected: 'Seçilməyib' }

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

  useEffect(() => {
    if (!user) return
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [user])

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

  const canRequestVip = user && user.card_type === 'standard' && user.vip_status !== 'pending'

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
                      <Link to={`/events/${r.event_id}`} className="min-w-0 font-medium text-slate-800 hover:text-primary-700">{r.event_name}</Link>
                      <span className="shrink-0 text-slate-500">{formatDate(r.starts_at)}</span>
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

        {logoutButton('mt-12 inline-flex w-full md:hidden')}
      </Container>
    </div>
  )
}

export { Account }
