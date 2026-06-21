'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StickyMobileCTAProps {
  phone:         string | null
  zalo:          string | null
  listing_title: string
  listing_id:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function zaloHref(phone: string | null, zalo: string | null): string | null {
  if (zalo) return zalo.startsWith('http') ? zalo : `https://zalo.me/${zalo}`
  if (phone) return `https://zalo.me/${phone.replace(/\D/g, '')}`
  return null
}

// ── Inline inquiry sheet (mobile) ─────────────────────────────────────────────

function InquirySheet({ listingTitle, onClose }: { listingTitle: string; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 700))
    setSending(false)
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative rounded-t-3xl bg-white px-5 pt-4 pb-6" role="dialog" aria-modal="true">
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-4xl" aria-hidden="true">✅</span>
            <p className="m-0 text-xl font-black text-[#0A0A0A]">Đã gửi!</p>
            <p className="m-0 text-[0.9375rem] text-neutral-500">
              Người bán sẽ liên hệ với bạn sớm.
            </p>
            <button type="button" onClick={onClose}
              className="mt-2 h-11 rounded-xl bg-vio-forest px-8 text-sm font-bold text-white">
              Đóng
            </button>
          </div>
        ) : (
          <>
            <h2 className="m-0 mb-1 text-lg font-black text-[#0A0A0A]">Gửi yêu cầu</h2>
            <p className="m-0 mb-4 text-[0.8125rem] text-neutral-500 line-clamp-1">{listingTitle}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Tên của bạn *"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3
                           text-[0.9375rem] placeholder:text-neutral-400
                           focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
              />
              <input
                type="tel"
                required
                placeholder="Số điện thoại *"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3
                           text-[0.9375rem] placeholder:text-neutral-400
                           focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
              />
              <textarea
                rows={2}
                placeholder="Tin nhắn (tùy chọn)"
                className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-3
                           text-[0.9375rem] placeholder:text-neutral-400
                           focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
              />
              <button
                type="submit"
                disabled={sending}
                className="flex h-12 w-full items-center justify-center rounded-xl
                           bg-vio-forest text-[0.9375rem] font-bold text-white
                           transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {sending ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── StickyMobileCTA ───────────────────────────────────────────────────────────

export function StickyMobileCTA({
  phone, zalo, listing_title,
}: StickyMobileCTAProps) {
  const [phoneRevealed, setPhoneRevealed] = useState(false)
  const [showInquiry,   setShowInquiry]   = useState(false)
  const zaloLink = zaloHref(phone, zalo)
  const hasAny   = phone || zaloLink

  if (!hasAny) return null

  return (
    <>
      {/* ── Sticky bar ──────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
                   border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className={['grid gap-2.5', phone && zaloLink ? 'grid-cols-3' : 'grid-cols-2'].join(' ')}>

          {/* Phone */}
          {phone && (
            phoneRevealed ? (
              <a
                href={`tel:${phone}`}
                className="flex flex-col items-center justify-center rounded-2xl
                           bg-vio-forest py-3 text-white no-underline transition-all active:scale-[0.97]"
              >
                <span className="text-xl leading-none" aria-hidden="true">📞</span>
                <span className="mt-1 text-[0.6875rem] font-bold">Gọi ngay</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setPhoneRevealed(true)}
                className="flex flex-col items-center justify-center rounded-2xl
                           bg-vio-forest py-3 text-white transition-all active:scale-[0.97]"
              >
                <span className="text-xl leading-none" aria-hidden="true">📞</span>
                <span className="mt-1 text-[0.6875rem] font-bold">Gọi</span>
              </button>
            )
          )}

          {/* Zalo */}
          {zaloLink && (
            <a
              href={zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center rounded-2xl
                         border border-neutral-200 bg-white py-3 text-[#0A0A0A]
                         no-underline transition-all active:scale-[0.97]"
            >
              <span className="text-xl leading-none" aria-hidden="true">💬</span>
              <span className="mt-1 text-[0.6875rem] font-bold">Zalo</span>
            </a>
          )}

          {/* Inquiry */}
          <button
            type="button"
            onClick={() => setShowInquiry(true)}
            className="flex flex-col items-center justify-center rounded-2xl
                       border border-neutral-200 bg-white py-3 text-[#0A0A0A]
                       transition-all active:scale-[0.97]"
          >
            <span className="text-xl leading-none" aria-hidden="true">📩</span>
            <span className="mt-1 text-[0.6875rem] font-bold">Hỏi thăm</span>
          </button>
        </div>

        {/* Revealed phone number row */}
        {phoneRevealed && phone && (
          <a
            href={`tel:${phone}`}
            className="mt-2.5 flex h-11 items-center justify-center rounded-xl bg-vio-forest
                       text-[0.9375rem] font-bold text-white no-underline transition-all active:scale-[0.98]"
          >
            📞 {phone}
          </a>
        )}
      </div>

      {/* Inquiry sheet */}
      {showInquiry && (
        <InquirySheet
          listingTitle={listing_title}
          onClose={() => setShowInquiry(false)}
        />
      )}
    </>
  )
}
