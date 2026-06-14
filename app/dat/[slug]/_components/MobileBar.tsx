'use client'

import { useState }           from 'react'
import Link                    from 'next/link'
import { trackPhoneReveal, trackZaloClick } from '@/features/signals/api/tracking.server'
import { InquiryTrigger }      from './InquirySheet'
import { VisitRequestTrigger } from './VisitRequestSheet'

interface MobileBarProps {
  isPro:        boolean
  phone:        string | null
  zalo:         string | null
  email:        string | null
  listingId:    string
  title:        string
}

export function MobileBar({
  isPro, phone, zalo, email: _email, listingId, title,
}: MobileBarProps) {
  const [saved,     setSaved]     = useState(false)
  const [showExtra, setShowExtra] = useState(false)

  const zaloLink = zalo
    ? (zalo.startsWith('http') ? zalo : `https://zalo.me/${zalo}`)
    : phone
    ? `https://zalo.me/${phone.replace(/\D/g, '')}`
    : null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40
                 border-t border-neutral-100 bg-white/95 backdrop-blur-xl
                 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]
                 pb-[env(safe-area-inset-bottom)]
                 lg:hidden"
    >
      {/* ── Extra actions tray (visit + inquiry for Pro) ──── */}
      {isPro && showExtra && (
        <div className="border-b border-neutral-100 px-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <VisitRequestTrigger
              listingId={listingId}
              listingTitle={title}
              label="Đặt lịch xem"
              variant="outline"
              fullWidth
            />
            <InquiryTrigger
              listingId={listingId}
              listingTitle={title}
              channel="general"
              label="Gửi yêu cầu"
              variant="outline"
              fullWidth
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">

        {/* Save bookmark */}
        <button
          type="button"
          onClick={() => setSaved(v => !v)}
          aria-label={saved ? 'Đã lưu' : 'Lưu tin'}
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
            'transition-colors',
            saved
              ? 'border-[#1A4D2E]/30 bg-[#1A4D2E]/10 text-[#1A4D2E]'
              : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300',
          ].join(' ')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
               fill={saved ? 'currentColor' : 'none'} aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                  stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
          </svg>
        </button>

        {isPro ? (
          /* ── Pro: primary call + zalo + more ─── */
          <>
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={() => void trackPhoneReveal(listingId)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl
                           bg-[#1A4D2E] text-[14px] font-bold text-white no-underline
                           transition-opacity active:opacity-80"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C7.61 21 3 16.39 3 11a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.26.2 2.47.57 3.58a1 1 0 0 1-.24 1.01l-2.21 2.2z"
                        stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                </svg>
                Gọi ngay
              </a>
            )}
            {zaloLink && (
              <a
                href={zaloLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void trackZaloClick(listingId)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                           border border-neutral-200 bg-white text-neutral-600 no-underline
                           transition-colors hover:border-neutral-300 active:bg-neutral-50"
                aria-label="Nhắn Zalo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                        stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
            {/* More actions toggle */}
            <button
              type="button"
              onClick={() => setShowExtra(v => !v)}
              aria-label="Thêm hành động"
              className={[
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                'transition-colors',
                showExtra
                  ? 'border-[#1A4D2E]/30 bg-[#1A4D2E]/10 text-[#1A4D2E]'
                  : 'border-neutral-200 bg-white text-neutral-500',
              ].join(' ')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="5"  r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </>
        ) : (
          /* ── Free: inquiry + visit as primary CTAs ─── */
          <>
            <InquiryTrigger
              listingId={listingId}
              listingTitle={title}
              channel="general"
              label="Gửi yêu cầu"
              variant="primary"
              fullWidth
            />
            <VisitRequestTrigger
              listingId={listingId}
              listingTitle={title}
              variant="outline"
              fullWidth={false}
              iconOnly
            />
            <Link
              href="/goi-thanh-vien"
              aria-label="Nâng cấp Pro"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                         border border-neutral-200 bg-white text-neutral-500 no-underline
                         transition-colors hover:border-neutral-300"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor"
                      strokeWidth="1.75"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.75"
                      strokeLinecap="round"/>
              </svg>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
