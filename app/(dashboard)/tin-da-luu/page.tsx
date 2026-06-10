import type { Metadata } from 'next'
import Link              from 'next/link'
import Image             from 'next/image'
import { createClient }  from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tin đã lưu — VIO AGRI' }
export const revalidate = 0

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedRow {
  listing_id: string
  listings: {
    id:            string
    slug:          string
    title:         string
    cover_url:     string | null
    location_text: string | null
    price_text:    string | null
    status:        string
  } | null
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptySaved() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
          <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="m-0 text-[15px] font-semibold text-gray-700">Chưa có tin đã lưu</p>
      <p className="m-0 mt-1 max-w-[280px] text-[13px] text-gray-400">
        Nhấn biểu tượng trái tim trên mỗi tin để lưu vào đây
      </p>
      <Link
        href="/dat-nong-nghiep"
        className="mt-5 rounded-full bg-vio-forest px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-90"
      >
        Khám phá đất
      </Link>
    </div>
  )
}

// ── Saved card ────────────────────────────────────────────────────────────────

function SavedCard({ listing }: { listing: NonNullable<SavedRow['listings']> }) {
  const isActive = listing.status === 'published'

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${listing.slug}`}
      className={[
        'group block overflow-hidden rounded-2xl border border-gray-100 bg-white',
        'shadow-[0_1px_4px_rgb(0,0,0,0.04)] no-underline',
        'transition-all duration-200 hover:shadow-[0_4px_16px_rgb(0,0,0,0.08)] hover:-translate-y-0.5',
        !isActive ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
        {listing.cover_url ? (
          <Image
            src={listing.cover_url}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
              Không còn hiển thị
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        {listing.price_text && (
          <p className="m-0 text-[15px] font-bold text-vio-forest">{listing.price_text}</p>
        )}
        <p className="m-0 mt-0.5 line-clamp-2 text-[13px] font-semibold text-gray-800">
          {listing.title}
        </p>
        {listing.location_text && (
          <p className="m-0 mt-1 flex items-center gap-1 text-[12px] text-gray-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            {listing.location_text}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TinDaLuuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Query saved listings — join to listings table
  // Falls back to empty if listing_saves table doesn't exist yet
  let data: SavedRow[] | null = null
  try {
    const res = await supabase
      .from('listing_saves')
      .select(`
        listing_id,
        listings (
          id, slug, title, cover_url, location_text, price_text, status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    data = (res.data ?? null) as SavedRow[] | null
  } catch {
    data = null
  }

  const rows = (data ?? []).filter(r => r.listings !== null)

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Dashboard
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="m-0 text-[1.75rem] font-bold tracking-tight text-gray-900">
            Tin đã lưu
          </h1>
          {rows.length > 0 && (
            <span className="rounded-full border border-gray-100 bg-white px-3 py-1 text-[12px] font-semibold text-gray-500 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
              {rows.length} tin
            </span>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptySaved />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {rows.map(r => (
            <SavedCard key={r.listing_id} listing={r.listings!} />
          ))}
        </div>
      )}

    </div>
  )
}
