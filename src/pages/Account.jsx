import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Check, LogOut, Hourglass } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/context/AuthContext'
import { VipCard } from '@/components/account/VipCard'

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

const Account = () => {
  const { user, loading, logout, requestVip, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    fetch('/api/account')
      .then((res) => res.json())
      .then(setData)
      .finally(() => setFetching(false))
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

  return (
    <div className="min-h-screen pt-[72px] bg-gradient-to-br from-white via-slate-50 to-secondary-50">
      <Container className="py-16 lg:py-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <p className="text-primary-500 text-sm font-semibold mb-2 uppercase tracking-wider">Hesabım</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Salam, {user?.full_name || user?.email}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-accent-red transition"
          >
            <LogOut className="w-4 h-4" /> Çıxış
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-xl p-4 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 max-w-2xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3">
            {user?.vip_status === 'active' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <VipCard user={user} />
              </motion.div>
            )}

            {user?.vip_status === 'pending' && (
              <div className="vip-card-scene">
                <div className="vip-card-face vip-card-locked rounded-[1.5rem] relative w-full" style={{ aspectRatio: 1.586, position: 'relative' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                    <Hourglass className="w-8 h-8 text-slate-400 mb-3" />
                    <p className="font-bold text-slate-600 uppercase text-sm tracking-widest">Sorğunuz Gözlənilir</p>
                    <p className="text-xs text-slate-500 font-medium mt-2">
                      Ödəniş təsdiqləndikdən sonra VIP kartınız burada aktivləşəcək.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(user?.vip_status === 'none' || user?.vip_status === 'revoked') && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100 p-8 md:p-10 max-w-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-100 text-secondary-600 flex items-center justify-center text-xl">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 uppercase tracking-tight">VIP Üzv Olun</h3>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">50 AZN / il</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 font-medium mb-8">
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-accent-green mt-0.5 shrink-0" /> Fiziki kart əvəzinə rəqəmsal VIP kart</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-accent-green mt-0.5 shrink-0" /> Tədbirlərə sürətli QR giriş</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-accent-green mt-0.5 shrink-0" /> İştirak tarixçənizə hesabınızdan baxış</li>
                </ul>
                <button
                  onClick={handleRequestVip}
                  disabled={requesting}
                  className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-secondary-600 transition text-sm disabled:opacity-60"
                >
                  {requesting ? 'Göndərilir...' : 'VIP Üzvlüyə Sorğu Göndər'}
                </button>
                <p className="text-[11px] text-slate-400 font-medium mt-4 text-center">
                  Sorğu göndərdikdən sonra 50 AZN ödənişini ofisimizdə (nağd və ya köçürmə) tamamlayın.
                  Admin ödənişi təsdiqlədikdən sonra kartınız aktivləşəcək.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Profil Məlumatları</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400 font-medium">Email</span><span className="font-semibold text-slate-800">{user?.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-medium">Telefon</span><span className="font-semibold text-slate-800">{user?.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-medium">Qeydiyyat</span><span className="font-semibold text-slate-800">{formatDate(user?.created_at) || '—'}</span></div>
              </div>
            </div>

            {!fetching && data?.attendances?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Son İştirakınız</p>
                <div className="space-y-3">
                  {data.attendances.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{a.event_name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{formatDate(a.checked_in_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

export { Account }
