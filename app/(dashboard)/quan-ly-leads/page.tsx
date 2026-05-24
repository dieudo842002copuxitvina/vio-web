import type { Metadata }  from 'next'
import { createClient }   from '@/lib/supabase/server'
import Link               from 'next/link'
import { LeadStatusDropdown } from './_components/lead-status-dropdown'
import type { LeadStatus }    from '@/app/actions/lead-status'

export const metadata: Metadata = { title: 'Quản lý Leads' }
export const revalidate = 0 // always fresh — CRM data changes frequently

// ── Types ─────────────────────────────────────────────────────────────────────

interface Inquiry {
  id:          string
  buyer_name:  string | null
  buyer_phone: string
  message:     string | null
  status:      LeadStatus
  created_at:  string
  land_listings: { title: string; slug: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 60)   return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)   return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, buyer_name, buyer_phone, message, status, created_at, land_listings(title, slug)')
    .order('created_at', { ascending: false })

  const inquiries = (data ?? []) as Inquiry[]

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Mini CRM
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Khách hàng & Leads
          </h1>
        </div>
        <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 shadow-sm border border-gray-100 dark:bg-[#1C1C1E] dark:border-white/[0.06] dark:text-gray-400">
          {inquiries.length} liên hệ
        </span>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          Lỗi tải dữ liệu: {error.message}
        </div>
      )}

      {/* ── Empty state ── */}
      {inquiries.length === 0 && !error && (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="mb-4 text-5xl opacity-20 select-none" aria-hidden="true">📭</span>
          <p className="text-gray-500 dark:text-gray-400">Chưa có lead nào. Khi khách hàng gửi yêu cầu, chúng sẽ xuất hiện ở đây.</p>
        </div>
      )}

      {/* ── Lead cards ── */}
      <ul className="grid grid-cols-1 gap-4 list-none m-0 p-0 lg:grid-cols-2">
        {inquiries.map(inq => (
          <li key={inq.id}>
            <article className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E]">

              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 font-bold text-gray-900 dark:text-white truncate">
                    {inq.buyer_name ?? 'Khách ẩn danh'}
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {relativeTime(inq.created_at)}
                  </p>
                </div>
                <LeadStatusDropdown
                  inquiryId={inq.id}
                  currentStatus={inq.status ?? 'new'}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

              {/* Phone */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400" aria-hidden="true">📞</span>
                  <span className="font-bold text-gray-900 dark:text-white tracking-wide">
                    {inq.buyer_phone}
                  </span>
                </div>
                <a
                  href={`tel:${inq.buyer_phone}`}
                  className="flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5 text-xs font-semibold text-[#34C759] no-underline transition-opacity hover:opacity-80 dark:bg-[#30D158]/15 dark:text-[#30D158]"
                >
                  Gọi ngay
                </a>
              </div>

              {/* Message */}
              {inq.message && (
                <p className="m-0 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
                  "{inq.message}"
                </p>
              )}

              {/* Listing link */}
              {inq.land_listings && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400" aria-hidden="true">🌾</span>
                  <Link
                    href={`/dat-nong-nghiep/chi-tiet/${inq.land_listings.slug}`}
                    className="truncate text-sm font-medium text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
                  >
                    {inq.land_listings.title}
                  </Link>
                </div>
              )}

            </article>
          </li>
        ))}
      </ul>

    </div>
  )
}
