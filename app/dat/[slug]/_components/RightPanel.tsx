'use client'

import { useState }   from 'react'
import Link            from 'next/link'
import type { ListingSellerProfile } from '@/entities/listing/api/listing.server'
import {
  trackPhoneReveal,
  trackZaloClick,
  trackEmailClick,
}                      from '@/features/signals/api/tracking.server'
import { InquiryTrigger }      from './InquirySheet'
import { VisitRequestTrigger } from './VisitRequestSheet'
import { PriceAlertTrigger }   from './PriceAlertSheet'
import { SellerTrustBadge }    from './SellerTrustBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrustChecks {
  hasImages:     boolean
  hasLocation:   boolean
  hasLegal:      boolean
  ownerVerified: boolean
}

export interface RightPanelProps {
  price_text:              string | null
  price_per_m2:            string | null
  area_text:               string | null
  legal_status:            string | null
  profile:                 ListingSellerProfile | null
  profileRole:             string | null
  joinDate:                string | null
  activeListings:          number | null
  sellerTrustScore?:       number | null
  sellerResponseRate?:     number | null
  sellerAvgResponseHours?: number | null
  isPro:                   boolean
  phone:                   string | null
  zalo:                    string | null
  email:                   string | null
  trust:                   TrustChecks
  listingId:               string
  listingTitle:            string
  daysListed:              string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(-2).map(w => w[0] ?? '').join('').toUpperCase()
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length < 6) return '•••• ••••'
  return d.slice(0, 4) + ' ••••'
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '••••@••••'
  const prefix = local && local.length > 2 ? local.slice(0, 2) + '••' : '••••'
  return `${prefix}@${domain}`
}

function zaloUrl(zalo: string | null, phone: string | null): string | null {
  if (zalo) return zalo.startsWith('http') ? zalo : `https://zalo.me/${zalo}`
  if (phone) return `https://zalo.me/${phone.replace(/\D/g, '')}`
  return null
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         className="shrink-0 text-neutral-400">
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C7.61 21 3 16.39 3 11a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.26.2 2.47.57 3.58a1 1 0 0 1-.24 1.01l-2.21 2.2z"
            stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         className="shrink-0 text-neutral-400">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         className="shrink-0 text-neutral-400">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.75"
                strokeLinejoin="round"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round"/>
    </svg>
  )
}

// ── Owner card ────────────────────────────────────────────────────────────────

function OwnerCard({
  profile, role, joinDate, activeListings,
}: {
  profile:       ListingSellerProfile
  role:          string | null
  joinDate:      string | null
  activeListings: number | null
}) {
  return (
    <div className="border-b border-neutral-100 px-5 py-5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
        Người bán
      </p>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden
                        rounded-full bg-[#E8F0E8] text-[14px] font-bold text-[#1A4D2E]">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover"
                 loading="lazy"/>
          ) : (
            initials(profile.full_name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="m-0 truncate text-[15px] font-bold text-[#1d1d1f]">
              {profile.full_name ?? 'Chủ đất'}
            </p>
            {profile.is_verified && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   aria-label="Đã xác thực">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                      stroke="#1A4D2E" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {role && (
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px]
                               font-semibold text-neutral-500">
                {role}
              </span>
            )}
            {joinDate && (
              <span className="text-[11px] text-neutral-400">Từ {joinDate}</span>
            )}
          </div>
          {activeListings != null && activeListings > 0 && (
            <p className="m-0 mt-1 text-[12px] text-neutral-400">
              {activeListings} tin đang đăng
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Trust section ─────────────────────────────────────────────────────────────

function TrustSection({ trust }: { trust: TrustChecks }) {
  const checks = [
    { label: 'Có hình ảnh',            ok: trust.hasImages     },
    { label: 'Có vị trí',              ok: trust.hasLocation   },
    { label: 'Có giấy tờ pháp lý',     ok: trust.hasLegal      },
    { label: 'Tài khoản xác thực',     ok: trust.ownerVerified },
  ].filter(c => c.ok)

  if (checks.length === 0) return null

  return (
    <div className="border-t border-neutral-100 px-5 py-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
        Độ tin cậy
      </p>
      <div className="space-y-2">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                            bg-[#1A4D2E]/10">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="#1A4D2E" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[13px] text-neutral-600">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ProContact — full contact details (Pro users only) ────────────────────────

function ProContact({
  phone, zaloLink, email, listingId, listingTitle, priceText,
}: {
  phone:        string | null
  zaloLink:     string | null
  email:        string | null
  listingId:    string
  listingTitle: string
  priceText:    string | null
}) {
  return (
    <div className="space-y-2.5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
        Liên hệ trực tiếp
      </p>

      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => void trackPhoneReveal(listingId)}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl
                     bg-[#1A4D2E] text-[14px] font-bold text-white no-underline
                     transition-opacity hover:opacity-90 active:opacity-80"
        >
          <PhoneIcon/>
          <span className="text-white">Gọi ngay — {phone}</span>
        </a>
      )}

      {zaloLink && (
        <a
          href={zaloLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void trackZaloClick(listingId)}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl
                     border border-neutral-200 bg-white text-[14px] font-bold text-[#1d1d1f]
                     no-underline transition-colors hover:bg-neutral-50 active:bg-neutral-100"
        >
          <ChatIcon/>
          Nhắn Zalo
        </a>
      )}

      {/* Visit request — buyer flow, not seller calendar */}
      <VisitRequestTrigger
        listingId={listingId}
        listingTitle={listingTitle}
        variant="outline"
        fullWidth
      />

      {email && (
        <a
          href={`mailto:${email}`}
          onClick={() => void trackEmailClick(listingId)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl
                     text-[13px] text-neutral-500 no-underline transition-colors
                     hover:bg-neutral-50 hover:text-[#1d1d1f]"
        >
          <MailIcon/>
          {email}
        </a>
      )}

      {/* Price alert — tertiary action */}
      <div className="flex justify-center pt-1">
        <PriceAlertTrigger
          listingId={listingId}
          listingTitle={listingTitle}
          currentPrice={priceText}
        />
      </div>
    </div>
  )
}

// ── LockedContact — free users: mask contact + open inquiry form ──────────────

function LockedContact({
  phone, zalo, email, listingId, listingTitle, priceText,
}: {
  phone:        string | null
  zalo:         string | null
  email:        string | null
  listingId:    string
  listingTitle: string
  priceText:    string | null
}) {
  const hasZalo  = !!(zalo || phone)
  const hasEmail = !!email

  return (
    <div className="space-y-3">
      {/* Masked contact preview */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50">
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center
                        rounded-full border border-neutral-200 bg-white text-neutral-500">
          <LockIcon/>
        </div>
        <div className="divide-y divide-neutral-100 px-4">
          {phone && (
            <div className="flex items-center gap-3 py-3.5">
              <PhoneIcon/>
              <span className="font-mono text-[15px] font-bold tracking-[0.12em]
                               text-neutral-300 select-none">
                {maskPhone(phone)}
              </span>
            </div>
          )}
          {hasZalo && (
            <div className="flex items-center gap-3 py-3.5">
              <ChatIcon/>
              <span className="text-[13px] text-neutral-300 select-none">Zalo ••••••</span>
            </div>
          )}
          {hasEmail && (
            <div className="flex items-center gap-3 py-3.5">
              <MailIcon/>
              <span className="text-[13px] text-neutral-300 select-none">
                {maskEmail(email!)}
              </span>
            </div>
          )}
          {!phone && !hasZalo && !hasEmail && (
            <div className="flex items-center gap-3 py-3.5">
              <PhoneIcon/>
              <span className="font-mono text-[15px] font-bold tracking-[0.12em]
                               text-neutral-300">•••• ••••</span>
            </div>
          )}
        </div>
      </div>

      {/* Pro upgrade CTA */}
      <Link
        href="/goi-thanh-vien"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl
                   bg-[#1A4D2E] text-[14px] font-bold text-white no-underline
                   transition-opacity hover:opacity-90 active:opacity-80"
      >
        <LockIcon/>
        Xem liên hệ với Pro
      </Link>
      <p className="text-center text-[11.5px] text-neutral-400">
        990.000đ/tháng · Hủy bất kỳ lúc
      </p>

      {/* ── Free-user lead capture — always available ── */}
      <div className="border-t border-neutral-100 pt-3">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Hoặc liên hệ qua VIO AGRI
        </p>

        <InquiryTrigger
          listingId={listingId}
          listingTitle={listingTitle}
          channel="general"
          label="Gửi yêu cầu tư vấn"
          variant="outline"
          fullWidth
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <VisitRequestTrigger
            listingId={listingId}
            listingTitle={listingTitle}
            label="Đặt lịch xem"
            variant="outline"
            fullWidth
          />
          <PriceAlertTrigger
            listingId={listingId}
            listingTitle={listingTitle}
            currentPrice={priceText}
            variant="outline"
            fullWidth
          />
        </div>
      </div>
    </div>
  )
}

// ── RightPanel ────────────────────────────────────────────────────────────────

export function RightPanel({
  price_text, price_per_m2, area_text, legal_status,
  profile, profileRole, joinDate, activeListings,
  sellerTrustScore, sellerResponseRate, sellerAvgResponseHours,
  isPro, phone, zalo, email,
  trust, listingId, listingTitle, daysListed,
}: RightPanelProps) {
  const [saved,  setSaved]  = useState(false)
  const [copied, setCopied] = useState(false)

  const zaloLink = zaloUrl(zalo, phone)

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      void navigator.share({ title: listingTitle, url })
    } else {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white
                    shadow-[0_8px_40px_rgba(0,0,0,0.08)]">

      {/* ── Price ──────────────────────────────────────────── */}
      <div className="border-b border-neutral-100 px-5 pt-5 pb-4">
        {price_text ? (
          <p className="m-0 text-[28px] font-black leading-none tracking-tight text-[#1d1d1f]">
            {price_text}
          </p>
        ) : (
          <p className="m-0 text-xl font-bold text-neutral-400">Thương lượng</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]
                        text-neutral-500">
          {area_text    && <span>{area_text}</span>}
          {price_per_m2 && <span className="font-semibold text-[#1d1d1f]">{price_per_m2}</span>}
          {legal_status && (
            <span className="rounded-full bg-[#1A4D2E]/8 px-2.5 py-0.5 text-[11px]
                             font-bold text-[#1A4D2E]">
              {legal_status}
            </span>
          )}
        </div>
        <p className="m-0 mt-2 text-[11px] text-neutral-400">Đăng {daysListed}</p>
      </div>

      {/* ── Owner ──────────────────────────────────────────── */}
      {profile && (
        <OwnerCard
          profile={profile}
          role={profileRole}
          joinDate={joinDate}
          activeListings={activeListings}
        />
      )}

      {/* ── Seller trust badge ─────────────────────────────── */}
      {(sellerTrustScore != null || sellerResponseRate != null) && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <SellerTrustBadge
            trustScore={sellerTrustScore ?? null}
            responseRate={sellerResponseRate ?? null}
            avgResponseHours={sellerAvgResponseHours ?? null}
            isVerified={profile?.is_verified ?? false}
            totalListings={activeListings}
          />
        </div>
      )}

      {/* ── Contact ────────────────────────────────────────── */}
      <div className="px-5 py-5">
        {isPro ? (
          <ProContact
            phone={phone}
            zaloLink={zaloLink}
            email={email}
            listingId={listingId}
            listingTitle={listingTitle}
            priceText={price_text}
          />
        ) : (
          <LockedContact
            phone={phone}
            zalo={zalo}
            email={email}
            listingId={listingId}
            listingTitle={listingTitle}
            priceText={price_text}
          />
        )}
      </div>

      {/* ── Save / Share / Report ──────────────────────────── */}
      <div className="border-t border-neutral-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSaved(v => !v)}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]
                       font-medium text-neutral-500 transition-colors
                       hover:bg-neutral-100 hover:text-[#1d1d1f]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill={saved ? 'currentColor' : 'none'} aria-hidden="true"
                 className={saved ? 'text-[#1A4D2E]' : ''}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                    stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            </svg>
            {saved ? 'Đã lưu' : 'Lưu tin'}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]
                       font-medium text-neutral-500 transition-colors
                       hover:bg-neutral-100 hover:text-[#1d1d1f]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.75"/>
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/>
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51 8.59 10.49"
                    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            {copied ? 'Đã sao chép' : 'Chia sẻ'}
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]
                       font-medium text-neutral-400 transition-colors
                       hover:bg-red-50 hover:text-red-500"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
                    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
                    strokeLinejoin="round"/>
            </svg>
            Báo cáo
          </button>
        </div>
      </div>

      {/* ── Trust ──────────────────────────────────────────── */}
      <TrustSection trust={trust}/>
    </div>
  )
}
