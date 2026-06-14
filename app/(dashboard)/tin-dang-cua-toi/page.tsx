import type { Metadata } from 'next'
import Link              from 'next/link'
import Image             from 'next/image'
import { createClient }  from '@/lib/supabase/server'
import type { ListingCompleteness, CompletenessTier } from '@/entities/listing/model/normalized-types'

export const metadata: Metadata = { title: 'Tin đăng của tôi — VIO AGRI' }
export const revalidate = 0

// ── Types ─────────────────────────────────────────────────────────────────────

interface ListingRow {
  id:            string
  slug:          string
  title:         string
  cover_url:     string | null
  location_text: string | null
  price_text:    string | null
  status:        string
  is_featured:   boolean
  created_at:    string
  published_at:  string | null
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

// ── Completeness tier badge ────────────────────────────────────────────────────

const TIER_CFG: Record<CompletenessTier, { label: string; cls: string }> = {
  platinum: { label: 'Platinum', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  gold:     { label: 'Gold',     cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  silver:   { label: 'Silver',   cls: 'bg-gray-100  text-gray-600   border-gray-200'   },
  bronze:   { label: 'Bronze',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

function TierBadge({ c }: { c: ListingCompleteness }) {
  const cfg = TIER_CFG[c.tier]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
      {cfg.label} · {c.total_score}
    </span>
  )
}

// ── Inline completion hints ───────────────────────────────────────────────────
// Shows top 2 missing fields as action chips with score gain.

interface Hint { label: string; gain: number; href: string }

function getTopHints(c: ListingCompleteness | null, listingId: string): Hint[] {
  if (!c) return []
  const base  = `/dashboard/listings/new?resume=${listingId}`
  const hints: Hint[] = []

  if (c.photo_score < 10)   hints.push({ label: 'Thêm ảnh',        gain: 20 - c.photo_score, href: `${base}&tab=media` })
  if (!c.has_gps)           hints.push({ label: 'Cắm GPS',          gain: 10 - c.gps_score,   href: `${base}&tab=location` })
  if (c.legal_score < 10)   hints.push({ label: 'Xác nhận pháp lý', gain: 15 - c.legal_score, href: `${base}&tab=legal` })
  if (!c.has_infra)         hints.push({ label: 'Bổ sung hạ tầng',  gain: 15 - c.infra_score, href: `${base}&tab=infra` })
  if (!c.has_agriculture)   hints.push({ label: 'Dữ liệu canh tác', gain: 20 - c.agri_score,  href: `${base}&tab=agri` })

  return hints
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2)
}

function CompletionHints({ c, listingId }: { c: ListingCompleteness | null; listingId: string }) {
  const hints = getTopHints(c, listingId)
  if (hints.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hints.map(h => (
        <Link
          key={h.label}
          href={h.href}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300
                     bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700
                     no-underline transition-colors hover:bg-amber-100"
        >
          + {h.label}
          <span className="rounded-full bg-amber-200/60 px-1 text-[9px] font-bold">+{h.gain}đ</span>
        </Link>
      ))}
    </div>
  )
}

// ── Edit link helper ──────────────────────────────────────────────────────────
// Drafts: resume wizard. Published/others: generic edit link.

function editHref(l: ListingRow): string {
  if (l.status === 'draft') return `/dashboard/listings/new?resume=${l.id}`
  return `/dashboard/listings/new?resume=${l.id}`   // same for all statuses
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
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard/listings/new"
          className="rounded-full bg-vio-forest px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-90"
        >
          Đăng tin ngay
        </Link>
        <Link
          href="/dashboard/listings/import"
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-gray-600 no-underline hover:bg-gray-50"
        >
          Nhập hàng loạt (CSV)
        </Link>
      </div>
    </div>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileListingCard({
  l,
  completeness,
}: {
  l:            ListingRow
  completeness: ListingCompleteness | null
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgb(0,0,0,0.04)]">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {l.cover_url ? (
            <Image src={l.cover_url} alt={l.title} fill className="object-cover" sizes="64px"/>
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

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusDot status={l.status}/>
              {completeness && <TierBadge c={completeness}/>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={editHref(l)} className="text-[12px] font-semibold text-gray-500 no-underline hover:text-gray-800">
                {l.status === 'draft' ? 'Tiếp tục' : 'Sửa'}
              </Link>
              {l.status !== 'draft' && (
                <Link href={`/dat/${l.slug}`} target="_blank" className="text-[12px] font-semibold text-vio-forest no-underline hover:underline">
                  Xem
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completion hints */}
      <CompletionHints c={completeness} listingId={l.id}/>
    </div>
  )
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function TableRow({
  l,
  completeness,
}: {
  l:            ListingRow
  completeness: ListingCompleteness | null
}) {
  return (
    <tr className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
      {/* Image + title */}
      <td className="py-3 pl-5 pr-4">
        <div className="flex items-start gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {l.cover_url ? (
              <Image src={l.cover_url} alt={l.title} fill className="object-cover" sizes="40px"/>
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
            <p className="m-0 max-w-[220px] truncate text-[13.5px] font-semibold text-gray-900">
              {l.title}
            </p>
            {completeness && <TierBadge c={completeness}/>}
            <CompletionHints c={completeness} listingId={l.id}/>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="py-3 pr-4 text-[13px] text-gray-500">
        <span className="block max-w-[130px] truncate">{l.location_text ?? '—'}</span>
      </td>

      {/* Price */}
      <td className="py-3 pr-4 text-[13.5px] font-semibold text-gray-700">
        {l.price_text ?? '—'}
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <StatusDot status={l.status}/>
      </td>

      {/* Actions */}
      <td className="py-3 pr-5">
        <div className="flex items-center gap-3">
          <Link
            href={editHref(l)}
            className="text-[13px] font-semibold text-gray-500 no-underline hover:text-gray-900"
          >
            {l.status === 'draft' ? 'Tiếp tục →' : 'Sửa'}
          </Link>
          {l.status !== 'draft' && (
            <Link
              href={`/dat/${l.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-gray-400 no-underline hover:text-gray-700"
            >
              Xem
            </Link>
          )}
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
    .select('id, slug, title, cover_url, location_text, price_text, status, is_featured, created_at, published_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const listings = (data ?? []) as ListingRow[]

  // Fetch completeness scores for all listings
  const listingIds = listings.map(l => l.id)
  const completenessMap = new Map<string, ListingCompleteness>()

  if (listingIds.length > 0) {
    const { data: completenessRows } = await supabase
      .from('listing_completeness')
      .select('*')
      .in('listing_id', listingIds)

    for (const row of ((completenessRows ?? []) as unknown as ListingCompleteness[])) {
      completenessMap.set(row.listing_id, row)
    }
  }

  // Counts per status
  const activeCnt  = listings.filter(l => l.status === 'published').length
  const draftCnt   = listings.filter(l => l.status === 'draft').length
  const expiredCnt = listings.filter(l => l.status === 'expired').length

  // Listings needing attention (has completeness but below silver = score < 55)
  const needsAttention = listings.filter(l => {
    const c = completenessMap.get(l.id)
    return c && (c.tier === 'bronze' || c.total_score < 55)
  }).length

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Dashboard
          </p>
          <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
            Tin đăng của tôi
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/listings/import"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5
                       text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Nhập CSV
          </Link>
          <Link
            href="/dashboard/listings/new"
            className="flex items-center gap-2 rounded-full bg-vio-forest px-4 py-2.5
                       text-[13px] font-bold text-white no-underline hover:opacity-90"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Đăng tin mới
          </Link>
        </div>
      </div>

      {/* ── Summary pills ─────────────────────────────────────────── */}
      {listings.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1
                           text-[12px] font-semibold text-gray-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>
            {activeCnt} đang hiển thị
          </span>
          {draftCnt > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1
                             text-[12px] font-semibold text-gray-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300"/>
              {draftCnt} nháp
            </span>
          )}
          {expiredCnt > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1
                             text-[12px] font-semibold text-red-500 shadow-[0_1px_2px_rgb(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400"/>
              {expiredCnt} hết hạn
            </span>
          )}
          {needsAttention > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1
                             text-[12px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>
              {needsAttention} cần bổ sung
            </span>
          )}
        </div>
      )}

      {/* ── Draft resume banner ───────────────────────────────────── */}
      {draftCnt > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-600">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="flex-1 text-[13px] font-medium text-amber-700 m-0">
            Bạn có <strong>{draftCnt} tin nháp</strong> chưa hoàn thành.
            Nhấp <strong>Tiếp tục →</strong> bên dưới để hoàn thiện và đăng.
          </p>
        </div>
      )}

      {listings.length === 0 ? (
        <EmptyListings/>
      ) : (
        <>
          {/* ── Mobile: stacked cards ─────────────────────────────── */}
          <div className="flex flex-col gap-3 md:hidden">
            {listings.map(l => (
              <MobileListingCard
                key={l.id}
                l={l}
                completeness={completenessMap.get(l.id) ?? null}
              />
            ))}
          </div>

          {/* ── Desktop: table ────────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white
                          shadow-[0_1px_4px_rgb(0,0,0,0.04)] md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Tiêu đề & Điểm', 'Tỉnh', 'Giá', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="py-3 pl-5 pr-4 text-left text-[11px] font-bold
                                           uppercase tracking-[0.08em] text-gray-400 first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <TableRow
                    key={l.id}
                    l={l}
                    completeness={completenessMap.get(l.id) ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
