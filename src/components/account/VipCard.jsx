import { useState } from 'react'

const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

function formatMonthYear(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${months[d.getMonth()]}/${d.getFullYear()}`
}

const VipCard = ({ user }) => {
  const [flipped, setFlipped] = useState(false)

  return (
    <div>
      <div
        className="vip-card-scene"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label="Kartı çevirmək üçün klikləyin"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setFlipped((f) => !f)
        }}
      >
        <div className={`vip-card ${flipped ? 'flipped' : ''}`}>
          <div className="vip-card-face vip-card-front">
            <div className="vip-card-logo-mark" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>
            <div className="vip-card-front-content">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">International Youth</p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Dialogue Platform</p>
              </div>
              <div className="vip-card-chip" />
              <div>
                <p className="text-xl font-bold tracking-wide mb-1 text-[#0f172a]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black tracking-[0.15em] text-[#00aef6]">{user.membership_no}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500 bg-white/85 backdrop-blur px-2.5 py-1 rounded-full shadow-sm shrink-0">
                    Since {formatMonthYear(user.vip_activated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="vip-card-face vip-card-back">
            <div className="vip-card-qr-wrap">
              <img src="/api/account/qr.svg" alt="VIP QR code" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{user.membership_no}</p>
            <p className="text-xs text-slate-500 font-semibold text-center mt-2 px-4">
              Tədbir girişində bu kodu admin-ə göstərin
            </p>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6">
        Kartı çevirmək üçün üzərinə toxunun
      </p>
    </div>
  )
}

export { VipCard }
