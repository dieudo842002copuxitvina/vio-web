import Link from 'next/link'

// ── Shared type ───────────────────────────────────────────────────────────────

export interface DirectoryMerchant {
  id:                  string
  slug:                string
  business_name:       string
  description:         string | null
  avatar_url:          string | null
  is_verified:         boolean
  contact_phone:       string | null
  province_name:       string | null
  province_slug:       string | null
  merchant_id:         string
  created_at:          string
  trust_score:         number
  identity_verified:   boolean
  active_listings:     number
  avg_response_hours:  number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function avatarColor(name: string): string {
  const p = ['#1A4D2E', '#0071E3', '#FF9500', '#34C759', '#5856D6', '#FF3B30']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return p[Math.abs(h) % p.length]!
}

export function responseLabel(hours: number): string {
  if (hours <= 0)  return '—'
  if (hours < 1)   return '< 1 giờ'
  if (hours < 4)   return `~${Math.round(hours)} giờ`
  if (hours < 24)  return 'Trong ngày'
  return `${Math.round(hours / 24)} ngày`
}

// ── FeaturedMerchantCard — top hero card (rank #1) ───────────────────────────

export function FeaturedMerchantCard({ m }: { m: DirectoryMerchant }) {
  return (
    <Link
      href={`/doanh-nghiep/${m.slug}`}
      className="group flex flex-col gap-4 overflow-hidden rounded-2xl border-2 border-vio-primary/20
                 bg-white p-5 no-underline shadow-sm transition-all duration-300
                 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]
                 sm:flex-row sm:items-start"
    >
      {/* Avatar */}
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl
                   text-xl font-black text-white"
        style={{ backgroundColor: avatarColor(m.business_name) }}
        aria-hidden="true"
      >
        {m.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" loading="lazy" />
        ) : (
          initials(m.business_name)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="m-0 text-[1.0625rem] font-black leading-tight text-[#0A0A0A]
                          group-hover:text-vio-forest transition-colors">
              {m.business_name}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {m.identity_verified && (
                <span className="rounded-full bg-vio-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-vio-forest">
                  ✓ Định danh
                </span>
              )}
              {m.is_verified && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                  ✓ Xác thực
                </span>
              )}
              {m.province_name && (
                <span className="text-[0.75rem] text-neutral-400">📍 {m.province_name}</span>
              )}
            </div>
          </div>

          {/* Trust score */}
          <div className="shrink-0 text-right">
            <p className="m-0 text-2xl font-black text-vio-forest">
              {m.trust_score}
              <span className="text-[0.75rem] font-normal text-neutral-400">/100</span>
            </p>
            <p className="m-0 text-[0.625rem] font-bold uppercase tracking-wide text-neutral-400">Uy tín</p>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-vio-primary" style={{ width: `${m.trust_score}%` }} />
        </div>

        {/* Description */}
        {m.description && (
          <p className="m-0 mt-3 line-clamp-2 text-[0.8125rem] leading-snug text-neutral-500">
            {m.description}
          </p>
        )}

        {/* Stats + CTA */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-[0.8125rem] text-neutral-500">
            <span>
              <strong className="font-bold text-[#0A0A0A]">{m.active_listings}</strong> tin đăng
            </span>
            <span>
              Phản hồi <strong className="font-bold text-[#0A0A0A]">{responseLabel(m.avg_response_hours)}</strong>
            </span>
          </div>
          <span className="ml-auto text-[0.875rem] font-bold text-vio-forest opacity-80
                           group-hover:opacity-100 transition-opacity">
            Xem gian hàng →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── CompactFeaturedCard — rank #2 and #3 ─────────────────────────────────────

export function CompactFeaturedCard({ m }: { m: DirectoryMerchant }) {
  return (
    <Link
      href={`/doanh-nghiep/${m.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-vio-primary/15
                 bg-white p-4 no-underline shadow-sm transition-all duration-300
                 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
                     text-sm font-bold text-white"
          style={{ backgroundColor: avatarColor(m.business_name) }}
          aria-hidden="true"
        >
          {m.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={m.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" loading="lazy" />
            : initials(m.business_name)
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[0.9375rem] font-bold text-[#0A0A0A]
                        group-hover:text-vio-forest transition-colors">
            {m.business_name}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {m.identity_verified && (
              <span className="rounded-full bg-vio-primary/10 px-2 py-0.5 text-[10px] font-bold text-vio-forest">
                ✓ Định danh
              </span>
            )}
            {m.is_verified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                ✓ Xác thực
              </span>
            )}
          </div>
        </div>
        <p className="shrink-0 text-xl font-black text-vio-forest">{m.trust_score}</p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-vio-primary" style={{ width: `${m.trust_score}%` }} />
      </div>

      <div className="flex items-center justify-between text-[0.75rem] text-neutral-500">
        <span>{m.active_listings} tin đăng · {responseLabel(m.avg_response_hours)}</span>
        <span className="font-semibold text-vio-forest">→</span>
      </div>
    </Link>
  )
}

// ── MerchantCard — directory grid card ───────────────────────────────────────

export function MerchantCard({ m }: { m: DirectoryMerchant }) {
  return (
    <Link
      href={`/doanh-nghiep/${m.slug}`}
      className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 no-underline
                 shadow-sm transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
    >
      {/* Header: avatar + name + badges */}
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden
                     rounded-2xl text-sm font-bold text-white"
          style={{ backgroundColor: avatarColor(m.business_name) }}
          aria-hidden="true"
        >
          {m.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            : initials(m.business_name)
          }
        </div>
        <div className="min-w-0">
          <p className="m-0 line-clamp-2 text-[0.9375rem] font-bold leading-tight text-[#0A0A0A]
                        group-hover:text-vio-forest transition-colors">
            {m.business_name}
          </p>
          {m.province_name && (
            <p className="m-0 mt-0.5 text-[0.75rem] text-neutral-400">
              📍 {m.province_name}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      {(m.identity_verified || m.is_verified) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {m.identity_verified && (
            <span className="rounded-full bg-vio-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-vio-forest">
              ✓ Định danh
            </span>
          )}
          {m.is_verified && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
              ✓ Xác thực
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {m.description && (
        <p className="m-0 mb-4 line-clamp-2 text-[0.8125rem] leading-snug text-neutral-500">
          {m.description}
        </p>
      )}

      {/* Trust bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Điểm uy tín
          </span>
          <span className="text-[0.875rem] font-black text-vio-forest">
            {m.trust_score}
            <span className="text-[10px] font-normal text-neutral-400">/100</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-vio-primary transition-all"
            style={{ width: `${m.trust_score}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3.5">
        <div>
          <p className="m-0 text-[0.9375rem] font-black text-[#0A0A0A]">{m.active_listings}</p>
          <p className="m-0 text-[10px] text-neutral-400">Tin đăng</p>
        </div>
        <div className="h-6 w-px bg-neutral-100" />
        <div>
          <p className="m-0 text-[0.9375rem] font-black text-[#0A0A0A]">
            {responseLabel(m.avg_response_hours)}
          </p>
          <p className="m-0 text-[10px] text-neutral-400">Phản hồi</p>
        </div>
        <span className="text-[0.8125rem] font-bold text-vio-forest opacity-80 group-hover:opacity-100 transition-opacity">
          Xem →
        </span>
      </div>
    </Link>
  )
}
