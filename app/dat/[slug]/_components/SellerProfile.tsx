// Standalone seller profile section for the detail page left column.
// Complements the compact OwnerCard inside RightPanel with a richer view.

import Link from 'next/link'
import type { ListingSellerProfile } from '@/entities/listing/api/listing.server'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SellerProfileProps {
  profile:        ListingSellerProfile | null
  joinDate:       string | null
  activeListings: number | null
  storefrontSlug: string | null   // link to /doanh-nghiep/[slug] if exists
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(-2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ── SellerProfile ──────────────────────────────────────────────────────────────

export function SellerProfile({
  profile, joinDate, activeListings, storefrontSlug,
}: SellerProfileProps) {
  if (!profile) return null

  return (
    <section aria-labelledby="seller-heading">
      <h2
        id="seller-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Người bán
      </h2>

      <div className="rounded-[18px] border border-[rgba(60,60,67,0.1)] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8F0E8] text-[16px] font-bold text-[#1A4D2E]">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              initials(profile.full_name)
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-[#1d1d1f] m-0">
                {profile.full_name ?? 'Chủ đất'}
              </p>
              {profile.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1A4D2E]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1A4D2E]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Đã xác thực
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6e6e73]">
              {joinDate && (
                <span>Tham gia từ {joinDate}</span>
              )}
              {activeListings != null && activeListings > 0 && (
                <span>{activeListings} tin đang đăng</span>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1.5 text-[12px] font-medium text-[#3C3C43]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        stroke="#1A4D2E" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                Chủ đất
              </div>
              {profile.is_verified && (
                <div className="flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1.5 text-[12px] font-medium text-[#3C3C43]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.98-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                          stroke="#1A4D2E" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  Phản hồi nhanh
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View storefront link */}
        {storefrontSlug && (
          <div className="mt-4 border-t border-[rgba(60,60,67,0.08)] pt-4">
            <Link
              href={`/doanh-nghiep/${storefrontSlug}`}
              className="flex items-center justify-between text-[14px] font-semibold text-[#1A4D2E] no-underline hover:underline"
            >
              Xem hồ sơ người bán
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
