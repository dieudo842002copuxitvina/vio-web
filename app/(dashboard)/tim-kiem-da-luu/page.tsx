import type { Metadata }   from 'next'
import { createClient }    from '@/lib/supabase/server'
import { SavedSearchList } from './_components/SavedSearchList'
import type { SavedSearch } from './_components/SavedSearchList'

export const metadata: Metadata = { title: 'Tìm kiếm đã lưu — VIO AGRI' }
export const revalidate = 0

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TimKiemDaLuuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let searches: SavedSearch[] = []
  try {
    const res = await supabase
      .from('saved_searches')
      .select('id, label, query_url, filters, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    searches = (res.data ?? []) as SavedSearch[]
  } catch {
    searches = []
  }

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Dashboard
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="m-0 text-[1.75rem] font-black tracking-tight text-[#1d1d1f]">
            Tìm kiếm đã lưu
          </h1>
          {searches.length > 0 && (
            <span className="shrink-0 rounded-full border border-neutral-100 bg-white
                             px-3 py-1 text-[12px] font-semibold text-neutral-500
                             shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {searches.length} bộ lọc
            </span>
          )}
        </div>
        <p className="m-0 mt-1.5 text-[13px] text-neutral-400">
          Chạy lại tìm kiếm để xem đất mới phù hợp tiêu chí của bạn.
        </p>
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      <SavedSearchList searches={searches} />

      {/* ── Notification future hint ──────────────────────────── */}
      {searches.length > 0 && (
        <div className="mt-8 flex items-start gap-3 rounded-2xl
                        border border-neutral-100 bg-neutral-50 px-5 py-4">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="m-0 text-[13px] font-semibold text-[#1d1d1f]">
              Thông báo tự động đang được phát triển
            </p>
            <p className="m-0 mt-0.5 text-[12px] leading-relaxed text-neutral-400">
              Sắp tới, bạn sẽ nhận thông báo ngay khi có đất mới phù hợp tiêu chí đã lưu.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
