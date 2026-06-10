'use client'

import { useState, useRef } from 'react'
import type { ListingSellerProfile } from '@/entities/listing/api/listing.server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrustData {
  trust_score:        number
  identity_verified:  boolean
  active_listings:    number
  avg_response_hours: number
}

export interface ContactPanelProps {
  price_text:    string | null
  price_per_m2:  string | null
  area_text:     string | null
  legal_status:  string | null
  profile:       ListingSellerProfile | null
  trust:         TrustData | null
  phone:         string | null
  zalo:          string | null
  listing_title: string
  days_listed:   string
  listing_id:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length < 8) return phone
  return d.slice(0, 4) + ' xxx ' + d.slice(-3)
}

function formatResponse(hours: number): string {
  if (hours < 1)  return 'Dưới 1 giờ'
  if (hours < 24) return `~${Math.round(hours)} giờ`
  return `~${Math.round(hours / 24)} ngày`
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function zaloHref(phone: string | null, zaloUrl: string | null): string | null {
  if (zaloUrl) return zaloUrl.startsWith('http') ? zaloUrl : `https://zalo.me/${zaloUrl}`
  if (phone) return `https://zalo.me/${phone.replace(/\D/g, '')}`
  return null
}

// ── Inquiry modal ─────────────────────────────────────────────────────────────

function InquiryModal({
  listingTitle, listingId, onClose,
}: {
  listingTitle: string
  listingId:   string
  onClose:     () => void
}) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const nameRef    = useRef<HTMLInputElement>(null)
  const phoneRef   = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    // In production: call a Server Action or API route to save the inquiry
    // For now: simulate async send
    await new Promise(r => setTimeout(r, 800))
    setSending(false)
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center lg:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full rounded-t-3xl bg-white p-6 shadow-2xl lg:max-w-md lg:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-heading"
      >
        {/* Handle (mobile) */}
        <div className="mb-4 flex justify-center lg:hidden">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-4xl" aria-hidden="true">✅</span>
            <h2 className="m-0 text-xl font-black text-[#0A0A0A]">Đã gửi yêu cầu!</h2>
            <p className="m-0 text-[0.9375rem] text-neutral-500">
              Người bán sẽ liên hệ với bạn sớm nhất có thể.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-11 rounded-xl bg-vio-forest px-8 text-sm font-bold text-white
                         transition-colors hover:bg-vio-forest-mid"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <h2 id="inquiry-heading" className="m-0 mb-1 text-xl font-black text-[#0A0A0A]">
              Gửi yêu cầu
            </h2>
            <p className="m-0 mb-5 text-[0.8125rem] text-neutral-500 line-clamp-1">
              {listingTitle}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="inq-name" className="mb-1 block text-[0.8125rem] font-semibold text-[#0A0A0A]">
                  Tên của bạn <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="inq-name"
                  ref={nameRef}
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3
                             text-[0.9375rem] placeholder:text-neutral-400
                             focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
                />
              </div>

              <div>
                <label htmlFor="inq-phone" className="mb-1 block text-[0.8125rem] font-semibold text-[#0A0A0A]">
                  Số điện thoại <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="inq-phone"
                  ref={phoneRef}
                  type="tel"
                  required
                  placeholder="0987 654 321"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3
                             text-[0.9375rem] placeholder:text-neutral-400
                             focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
                />
              </div>

              <div>
                <label htmlFor="inq-msg" className="mb-1 block text-[0.8125rem] font-semibold text-[#0A0A0A]">
                  Tin nhắn
                </label>
                <textarea
                  id="inq-msg"
                  ref={messageRef}
                  rows={3}
                  placeholder="Tôi muốn hỏi thêm về lô đất này..."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-3
                             text-[0.9375rem] placeholder:text-neutral-400
                             focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-vio-forest
                           text-[0.9375rem] font-bold text-white transition-all
                           hover:bg-vio-forest-mid active:scale-[0.98]
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang gửi...
                  </span>
                ) : 'Gửi yêu cầu'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── ContactPanel — desktop sticky right column ────────────────────────────────

export function ContactPanel({
  price_text, price_per_m2, area_text, legal_status,
  profile, trust, phone, zalo,
  listing_title, days_listed, listing_id,
}: ContactPanelProps) {
  const [phoneRevealed, setPhoneRevealed] = useState(false)
  const [inquiryOpen,   setInquiryOpen]   = useState(false)

  const zaloLink = zaloHref(phone, zalo)

  return (
    <>
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.09)] overflow-hidden">

        {/* ── Price block ───────────────────────────────── */}
        <div className="border-b border-neutral-100 px-6 pt-6 pb-5">
          {price_text ? (
            <p className="m-0 text-3xl font-black tracking-tight text-[#0A0A0A]">
              {price_text}
            </p>
          ) : (
            <p className="m-0 text-xl font-bold text-neutral-400">Thương lượng</p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
            {area_text    && <span>📐 {area_text}</span>}
            {price_per_m2 && <span className="font-semibold text-[#0A0A0A]">{price_per_m2}</span>}
            {legal_status && (
              <span className="rounded-full bg-vio-primary/10 px-2.5 py-0.5 text-[0.75rem] font-bold text-vio-forest">
                📄 {legal_status}
              </span>
            )}
          </div>
        </div>

        {/* ── Seller block ──────────────────────────────── */}
        {profile && (
          <div className="border-b border-neutral-100 px-6 py-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Người bán
            </p>

            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden
                              rounded-full bg-neutral-100 text-sm font-bold text-neutral-600">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  initials(profile.full_name)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="m-0 truncate text-[0.9375rem] font-bold text-[#0A0A0A]">
                    {profile.full_name ?? 'Chủ đất'}
                  </p>
                  {(profile.is_verified || trust?.identity_verified) && (
                    <span className="shrink-0 text-[0.6875rem] font-bold text-vio-forest" aria-label="Đã xác thực">
                      ✓
                    </span>
                  )}
                </div>

                {trust && (
                  <div className="mt-1 flex items-center gap-2 text-[0.75rem] text-neutral-500">
                    {trust.active_listings > 0 && (
                      <span>{trust.active_listings} tin đăng</span>
                    )}
                    {trust.avg_response_hours > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>P/hồi {formatResponse(trust.avg_response_hours)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Trust score bar */}
            {trust && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    Điểm uy tín
                  </span>
                  <span className="text-[0.875rem] font-black text-vio-forest">
                    {trust.trust_score}
                    <span className="text-[10px] font-normal text-neutral-400">/100</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-vio-primary transition-all duration-700"
                    style={{ width: `${trust.trust_score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CTA block ─────────────────────────────────── */}
        <div className="space-y-2.5 px-6 py-5">

          {/* Phone reveal */}
          {phone && (
            phoneRevealed ? (
              <a
                href={`tel:${phone}`}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl
                           bg-vio-forest text-[0.9375rem] font-bold text-white no-underline
                           transition-all hover:bg-vio-forest-mid active:scale-[0.98]"
              >
                📞 {phone}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setPhoneRevealed(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl
                           bg-vio-forest text-[0.9375rem] font-bold text-white
                           transition-all hover:bg-vio-forest-mid active:scale-[0.98]"
              >
                📞 Hiện số điện thoại
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.75rem] font-normal">
                  {maskPhone(phone)}
                </span>
              </button>
            )
          )}

          {/* Zalo */}
          {zaloLink && (
            <a
              href={zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl
                         border border-neutral-200 bg-white text-[0.9375rem] font-bold text-[#0A0A0A]
                         no-underline transition-all hover:border-neutral-300 hover:bg-neutral-50
                         active:scale-[0.98]"
            >
              <span aria-hidden="true">💬</span>
              Chat Zalo
            </a>
          )}

          {/* Inquiry */}
          <button
            type="button"
            onClick={() => setInquiryOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl
                       border border-neutral-200 bg-white text-[0.9375rem] font-bold text-[#0A0A0A]
                       transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]"
          >
            <span aria-hidden="true">📩</span>
            Gửi yêu cầu
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-6 py-3">
          <p className="m-0 text-center text-[0.75rem] text-neutral-400">
            Đăng {days_listed}
          </p>
        </div>
      </div>

      {/* Inquiry modal */}
      {inquiryOpen && (
        <InquiryModal
          listingTitle={listing_title}
          listingId={listing_id}
          onClose={() => setInquiryOpen(false)}
        />
      )}
    </>
  )
}
