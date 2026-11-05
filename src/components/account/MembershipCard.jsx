import { useState } from 'react'

const TIERS = {
  standard: { label: 'Standard', title: 'Standard Member' },
  vip: { label: 'VIP', title: 'VIP Member' },
  member: { label: 'Member', title: 'IYDP Team Member' },
}

const formatMonthYear = (iso) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

const MembershipCard = ({ user }) => {
  const [flipped, setFlipped] = useState(false)
  const tierKey = TIERS[user.card_type] ? user.card_type : 'standard'
  const tier = TIERS[tierKey]
  const since = tierKey === 'vip' ? user.vip_activated_at : user.created_at

  return (
    <div>
      <div
        className="member-card-scene"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label="Kartı çevirmək üçün toxunun"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
      >
        <div className={`member-card tier-${tierKey} ${flipped ? 'flipped' : ''}`}>
          <div className="member-card-face member-card-front">
            <div className="member-card-logo-mark" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>
            <div className="member-card-front-content">
              <div className="flex items-start justify-between gap-3">
                <div className="member-card-org text-[10px] font-bold uppercase tracking-[0.2em]">
                  <p>International Youth</p>
                  <p>Dialogue Platform</p>
                </div>
                <p className="member-card-tier shrink-0 text-sm font-bold uppercase tracking-[0.12em]">{tier.label}</p>
              </div>
              <div>
                <p className="member-card-name mb-1 truncate text-xl font-bold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="member-card-number truncate text-sm font-bold tracking-[0.1em]">{user.membership_no}</p>
                  {since && <p className="member-card-since shrink-0 text-[10px] font-semibold uppercase">Since {formatMonthYear(since)}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="member-card-face member-card-back">
            <div className="member-card-qr-wrap">
              <img src="/api/account/qr.svg" alt="Üzvlük kartının QR kodu" draggable="false" />
            </div>
            <div className="member-card-back-text">
              <p className="member-card-back-tier text-[10px] font-bold uppercase tracking-[0.15em]">{tier.title}</p>
              <p className="text-sm font-bold leading-snug text-[#0f172a] break-words">{user.full_name || user.email}</p>
              <p className="whitespace-nowrap text-[11px] font-bold tracking-[0.04em] text-slate-500">{user.membership_no}</p>
              <p className="text-[11px] font-semibold leading-snug text-slate-500">
                Tədbir girişində bu kodu göstərin
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-5 text-center text-xs font-medium text-slate-500">Kartı çevirmək üçün üzərinə toxunun</p>
    </div>
  )
}

export { MembershipCard }
