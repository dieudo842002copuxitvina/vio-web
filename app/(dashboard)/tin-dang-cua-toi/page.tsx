import type { Metadata } from 'next'
import Link              from 'next/link'
import Image             from 'next/image'
import { createClient }  from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tin đăng của tôi — VIO AGRI' }
export const revalidate = 0

// ── Types ─────────────────────────────────────────────────────────────────────

interface ListingRow {
  id:           string
  slug:         string
  title:        string
  cover_url:    string | null
  location_text: string | null
  price_text:   string | null
  status:       string
  is_featured:  boolean
  created_at:   string
  published_at: string | null
  expires_at:   string | null
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  published: { label: 'Đang hiển thị', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  paused:    { label: 'Tạm dừng',      dot: 'bg-amber-400',   text: 'text-amber-700'   },
  expired:   { label: 'Hết hạn',       dot: 'bg-red-400',     text: 'text-red-600'     },
  draft:     { label: 'Nháp',          dot: 'bg-gray-300',    text: 'text-gray-500'    },
  archived:  { label: 'Đã ẩn',         dot: 'bg-gray-300',    text: 'text-gray-400'    },
}

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, dot: 'bg-gray-300', text: 'text-gray-500' }
  return (
    <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${cfg.text}`}>
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyListings() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
          <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="m-0 text-[15px] font-semibold text-gray-700">Chưa có tin đăng nào</p>
      <p className="m-0 mt-1 text-[13px] text-gray-400">Đăng tin đầu tiên để tiếp cận người mua</p>
      <Link
        href="/dang-tin-dat"
        className="mt-5 rounded-full bg-vio-forest px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-90"
      >
        Đăng tin ngay
      </Link>
    </div>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileListingCard({ l }: { l: ListingRow }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgb(0,0,0,0.04)]">
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {l.cover_url ? (
          <Image
            src={l.cover_url}
            alt={l.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="m-0 line-clamp-1 text-[14px] font-semibold text-gray-900">{l.title}</p>
        {l.price_text && (
          <p className="m-0 mt-0.5 text-[13px] font-bold text-vio-forest">{l.price_text}</p>
        )}
        {l.location_text && (
          <p className="m-0 mt-0.5 text-[12px] text-gray-400 truncate">{l.location_text}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <StatusDot status={l.status} />
          <div className="flex items-center gap-2">
            <Link
              href={`/dang-tin-dat?edit=${l.id}`}
              className="text-[12px] font-semibold text-gray-500 no-underline hover:text-gray-800"
            >
              Sửa
            </Link>
            <Link
              href={`/dat-nong-nghiep/chi-tiet/${l.slug}`}
              target="_blank"
              className="text-[12px] font-semibold text-vio-forest no-underline hover:underline"
            >
              Xem
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function TableRow({ l }: { l: ListingRow }) {
  return (
    <tr className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
      {/* Image + title */}
      <td className="py-3.5 pl-5 pr-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {l.cover_url ? (
              <Image
                src={l.cover_url}
                alt={l.title}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="m-0 max-w-[240px] truncate text-[14px] font-semibold text-gray-900">
              {l.title}
            </p>
            {l.is_featured && (
              <span className="mt-0.5 inline-block text-[10px] font-bold text-amber-600">
                Nổi bật
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Province */}
      <td className="py-3.5 pr-4 text-[13px] text-gray-500">
        <span className="max-w-[120px] truncate block">
          {l.location_text ?? '—'}
        </span>
      </td>

      {/* Price */}
      <td className="py-3.5 pr-4 text-[14px] font-semibold text-gray-700">
        {l.price_text ?? '—'}
      </td>

      {/* Status */}
      <td className="py-3.5 pr-4">
        <StatusDot status={l.status} />
      </td>

      {/* Actions */}
      <td className="py-3.5 pr-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/dang-tin-dat?edit=${l.id}`}
            className="text-[13px] font-semibold text-gray-500 no-underline hover:text-gray-900"
          >
            Sửa
          </Link>
          {(l.status === 'expired' || l.status === 'paused') && (
            <Link
              href={`/dang-tin-dat?renew=${l.id}`}
              className="text-[13px] font-semibold text-vio-forest no-underline hover:underline"
            >
              Gia hạn
            </Link>
          )}
          <Link
            href={`/dat-nong-nghiep/chi-tiet/${l.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-gray-400 no-underline hover:text-gray-700"
          >
            Xem
          </Link>
        </div>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TinDangCuaToiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('listings')
    .select('id, slug, title, cover_url, location_text, price_text, status, is_featured, created_at, published_at, expires_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const listings = (data ?? []) as ListingRow[]

  // Counts per status
  const activeCnt  = listings.filter(l => l.status === 'published').length
  const expiredCnt = listings.filter(l => l.status === 'expired').length
  const draftCnt   = listings.filter(l => l.status === 'draft').length

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Dashboard
          </p>
          <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
            Tin đăng của tôi
          </h1>
        </div>
        <Link
          href="/dang-tin-dat"
          className="flex items-center gap-2 rounded-full bg-vio-forest px-4 py-2.5 text-[13px] font-bold text-white no-underline hover:opacity-90"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Đăng tin mới
        </Link>
      </div>

      {/* ── Summary pills ─────────────────────────────────────────── */}
      {listings.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activeCnt} đang hiển thị
          </span>
          {expiredCnt > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              {expiredCnt} hết hạn
            </span>
          )}
          {draftCnt > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              {draftCnt} nháp
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-gray-100 bg-white px-3 py-1 text-[12px] font-semibold text-gray-400 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
            {listings.length} tổng
          </span>
        </div>
      )}

      {listings.length === 0 ? (
        <EmptyListings />
      ) : (
        <>
          {/* ── Mobile: stacked cards ─────────────────────────────── */}
          <div className="flex flex-col gap-3 md:hidden">
            {listings.map(l => <MobileListingCard key={l.id} l={l} />)}
          </div>

          {/* ── Desktop: table ────────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)] md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    Tiêu đề
                  </th>
                  <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    Tỉnh
                  </th>
                  <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    Giá
                  </th>
                  <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    Trạng thái
                  </th>
                  <th className="py-3 pr-5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => <TableRow key={l.id} l={l} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
