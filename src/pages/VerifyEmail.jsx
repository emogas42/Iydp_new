import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

const FAILURES = {
  expired: ['Linkin vaxtı bitib', 'Hesabınıza daxil olub yeni link istəyin. Linklər 24 saat işləyir.'],
  invalid: ['Link işləmir', 'Bu link düzgün deyil və ya köhnədir. Ən son gələn məktubdakı linkdən istifadə edin.'],
  wrong_account: ['Başqa hesabla daxil olmusunuz', 'Bu link başqa hesab üçündür. Çıxış edib həmin hesabla daxil olun.'],
}

// The page confirms with a POST once it opens, so mail scanners that only fetch
// links can't confirm an address by themselves.
const VerifyEmail = () => {
  const [params] = useSearchParams()
  const location = useLocation()
  const { loading, refreshUser } = useAuth()
  const [status, setStatus] = useState('working')
  const started = useRef(false)

  useEffect(() => {
    if (loading || started.current) return
    started.current = true
    api.verifyEmail(params.get('token') || '')
      .then(() => refreshUser())
      .then(() => setStatus('done'))
      .catch((err) => setStatus(err.code || 'failed'))
  }, [loading, params, refreshUser])

  if (status === 'login_required') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  const failure = FAILURES[status] || ['Təsdiq alınmadı', 'Bir az sonra yenidən cəhd edin.']

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px]">
      <Container narrow className="py-20">
        <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center" aria-live="polite">
          {status === 'working' && <p className="text-slate-600">Email təsdiqlənir...</p>}

          {status === 'done' && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#4f7f2b]" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">Email təsdiqləndi</h1>
              <p className="mt-2 text-slate-600">İndi tədbir və layihələrə müraciət edə bilərsiniz.</p>
            </>
          )}

          {status !== 'working' && status !== 'done' && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-[#c7463a]" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-slate-900">{failure[0]}</h1>
              <p className="mt-2 text-slate-600">{failure[1]}</p>
            </>
          )}

          {status !== 'working' && (
            <Link to="/account" className="mt-6 inline-flex rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
              Hesabıma keç
            </Link>
          )}
        </div>
      </Container>
    </div>
  )
}

export { VerifyEmail }
