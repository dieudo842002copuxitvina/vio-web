import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Thị trường — VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 300   // re-compute every 5 min

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProvinceCount  { province_name: string; cnt: number }
interface LandTypeCount  { land_type: string;     cnt: number }
interface DailyNewRow    { day: string;            cnt: number }

// ── Land type labels ─────────────────────────────────────────────────────────

const LAND_LABELS: Record<string, string> = {
  cay_lau_nam:  'Cây lâu năm',
  lua_nuoc:     'Lúa nước',
  mat_nuoc:     'Mặt nước',
  trang_trai:   'Trang trại',
  vuon:         'Vườn',
  rung:         'Rừng',
  dat_trong:    'Đất trống',
}

// ── Data fetching ─────────────────────────────────────────────────────────────

interface MarketplaceStats {
  // Supply KPIs
  activeListings:   number
  activeSellers:    number
  newLast7d:        number
  draftCount:       number
  // Demand KPIs (30 days)
  leadsTotal:       number
  visitRequests:    number
  legalReviews:     number
  chatClicks:       number
  callClicks:       number
  // Breakdown
  topProvinces:     ProvinceCount[]
  landTypes:        LandTypeCount[]
  daily7d:          DailyNewRow[]
  completeness: {
    platinum: number; gold: number; silver: number; bronze: number
  }
}

async function fetchMarketplaceStats(): Promise<MarketplaceStats> {
  const supabase = await createClient()

  const now = new Date()
  const d7  = new Date(now.getTime() - 7  * 86400_000).toISOString()
  const d30 = new Date(now.getTime() - 30 * 86400_000).toISOString()

  // ── 1. Listings supply ───────────────────────────────────────────────────────
  const [
    { data: funnelRows },
    { data: activeSellersData },
    { data: newLast7dData },
    { data: topProvincesData },
  ] = await Promise.all([
    // Status funnel (draft, published, paused, expired, archived)
    supabase
      .from('listings')
      .select('status')
      .in('status', ['draft', 'published', 'paused', 'expired', 'archived'])
      .limit(10_000),

    // Distinct sellers with published listings
    supabase
      .from('listings')
      .select('owner_id')
      .eq('status', 'published')
      .limit(10_000),

    // New listings last 7 days
    supabase
      .from('listings')
      .select('id')
      .gte('created_at', d7)
      .limit(1000),

    // Top provinces by active listing count
    supabase
      .from('listings')
      .select('province_id, provinces!inner(name)')
      .eq('status', 'published')
      .limit(5000),
  ])

  // Tally status funnel
  const funnelMap: Record<string, number> = {}
  for (const row of (funnelRows ?? []) as { status: string }[]) {
    funnelMap[row.status] = (funnelMap[row.status] ?? 0) + 1
  }

  const activeListings = funnelMap.published ?? 0
  const draftCount     = funnelMap.draft     ?? 0
  const newLast7d      = (newLast7dData ?? []).length

  // Distinct sellers
  const sellerSet = new Set<string>()
  for (const row of (activeSellersData ?? []) as { owner_id: string }[]) {
    sellerSet.add(row.owner_id)
  }
  const activeSellers = sellerSet.size

  // Province tallies
  const provMap = new Map<string, number>()
  for (const row of (topProvincesData ?? []) as unknown as { provinces: { name: string } | { name: string }[] }[]) {
    const prov = Array.isArray(row.provinces) ? row.provinces[0] : row.provinces
    const name = prov?.name ?? 'Khác'
    provMap.set(name, (provMap.get(name) ?? 0) + 1)
  }
  const topProvinces: ProvinceCount[] = [...provMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([province_name, cnt]) => ({ province_name, cnt }))

  // ── 2. Land type breakdown from attribute_values ──────────────────────────────
  const { data: landTypeRows } = await supabase
    .from('listing_attribute_values')
    .select('value_text, listing_id')
    .eq('key', 'land_type')
    .limit(5000)

  const landMap = new Map<string, number>()
  for (const row of (landTypeRows ?? []) as { value_text: string | null; listing_id: string }[]) {
    if (row.value_text) {
      landMap.set(row.value_text, (landMap.get(row.value_text) ?? 0) + 1)
    }
  }
  const landTypes: LandTypeCount[] = [...landMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([land_type, cnt]) => ({ land_type, cnt }))

  // ── 3. Lead events (30 days) ─────────────────────────────────────────────────
  const { data: eventRows } = await supabase
    .from('lead_events')
    .select('event_type')
    .gte('created_at', d30)
    .limit(50_000)

  const evMap: Record<string, number> = {}
  for (const row of (eventRows ?? []) as { event_type: string }[]) {
    evMap[row.event_type] = (evMap[row.event_type] ?? 0) + 1
  }

  const leadsTotal    = Object.values(evMap).reduce((a, b) => a + b, 0)
  const visitRequests = evMap.request_visit ?? 0
  const legalReviews  = evMap.legal_review  ?? 0
  const chatClicks    = evMap.chat_click    ?? 0
  const callClicks    = evMap.call_click    ?? 0

  // ── 4. Completeness tier distribution ────────────────────────────────────────
  const { data: tierRows } = await supabase
    .from('listing_completeness')
    .select('tier')
    .limit(10_000)

  const tierMap: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 }
  for (const row of (tierRows ?? []) as { tier: string }[]) {
    if (row.tier in tierMap) tierMap[row.tier]++
  }

  // ── 5. New listings per day (last 7 days) ─────────────────────────────────────
  const { data: dailyRows } = await supabase
    .from('listings')
    .select('created_at')
    .gte('created_at', d7)
    .order('created_at')
    .limit(1000)

  const dailyMap = new Map<string, number>()
  for (const row of (dailyRows ?? []) as { created_at: string }[]) {
    const day = row.created_at.slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
  }
  // Fill last 7 days (including days with 0 listings)
  const daily7d: DailyNewRow[] = []
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now.getTime() - i * 86400_000)
    const key = d.toISOString().slice(0, 10)
    daily7d.push({ day: key, cnt: dailyMap.get(key) ?? 0 })
  }

  return {
    activeListings,
    activeSellers,
    newLast7d,
    draftCount,
    leadsTotal,
    visitRequests,
    legalReviews,
    chatClicks,
    callClicks,
    topProvinces,
    landTypes,
    daily7d,
    completeness: {
      platinum: tierMap.platinum ?? 0,
      gold:     tierMap.gold     ?? 0,
      silver:   tierMap.silver   ?? 0,
      bronze:   tierMap.bronze   ?? 0,
    },
  }
}

// ── Components ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent, warn,
}: {
  label:   string
  value:   string | number
  sub?:    string
  accent?: boolean
  warn?:   boolean
}) {
  return (
    <div className={[
      'flex flex-col gap-1 rounded-2xl border px-5 py-4',
      accent ? 'border-emerald-200/60 bg-emerald-50'
      : warn  ? 'border-amber-200/60  bg-amber-50'
      : 'border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)]',
    ].join(' ')}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </span>
      <span className={[
        'text-[1.85rem] font-black leading-none tabular-nums',
        accent ? 'text-emerald-700'
        : warn  ? 'text-amber-700'
        : 'text-gray-900',
      ].join(' ')}>
        {value}
      </span>
      {sub && (
        <span className="text-[11.5px] text-gray-400">{sub}</span>
      )}
    </div>
  )
}

// ── Spark bar chart (pure CSS) ────────────────────────────────────────────────

function SparkBar({ data }: { data: DailyNewRow[] }) {
  const maxVal = Math.max(...data.map(d => d.cnt), 1)
  return (
    <div className="flex h-10 items-end gap-1">
      {data.map(d => {
        const pct = Math.max((d.cnt / maxVal) * 100, d.cnt > 0 ? 8 : 2)
        const isToday = d.day === new Date().toISOString().slice(0, 10)
        return (
          <div
            key={d.day}
            title={`${d.day}: ${d.cnt} tin`}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height:           `${pct}%`,
              backgroundColor:  isToday ? '#2D6A4F' : '#B7DEC9',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function HBar({
  label, value, max, color = '#2D6A4F',
}: {
  label: string; value: number; max: number; color?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-[130px] shrink-0 truncate text-[12.5px] text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }}/>
      </div>
      <span className="w-10 text-right text-[12px] font-semibold tabular-nums text-gray-700">
        {value}
      </span>
    </div>
  )
}

// ── Funnel step ───────────────────────────────────────────────────────────────

function FunnelStep({
  label, value, sub, pct, last,
}: {
  label: string; value: number; sub?: string; pct?: number; last?: boolean
}) {
  return (
    <div className={`flex items-center gap-4 py-3 ${!last ? 'border-b border-gray-50' : ''}`}>
      <div className="flex-1">
        <p className="m-0 text-[13.5px] font-semibold text-gray-800">{label}</p>
        {sub && <p className="m-0 text-[11.5px] text-gray-400">{sub}</p>}
      </div>
      <div className="text-right">
        <span className="text-[18px] font-black tabular-nums text-gray-900">{value.toLocaleString('vi')}</span>
        {pct !== undefined && (
          <span className="ml-2 text-[11.5px] font-medium text-gray-400">{pct}%</span>
        )}
      </div>
    </div>
  )
}

// ── Tier badge pill ───────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { cls: string; label: string }> = {
  platinum: { cls: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Platinum' },
  gold:     { cls: 'bg-amber-50  text-amber-700  border-amber-200',  label: 'Gold'     },
  silver:   { cls: 'bg-gray-100  text-gray-600   border-gray-200',   label: 'Silver'   },
  bronze:   { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Bronze'   },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MarketplacePage() {
  const s = await fetchMarketplaceStats()

  const totalListings = s.activeListings + s.draftCount
  const publishRate   = totalListings > 0 ? Math.round((s.activeListings / totalListings) * 100) : 0
  const draftRate     = totalListings > 0 ? Math.round((s.draftCount / totalListings) * 100) : 0

  const topProvMax    = s.topProvinces[0]?.cnt ?? 1
  const landTypeMax   = s.landTypes[0]?.cnt    ?? 1

  const tierTotal     = s.completeness.platinum + s.completeness.gold + s.completeness.silver + s.completeness.bronze

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Vận hành
        </p>
        <h1 className="m-0 mt-1 text-[1.75rem] font-black tracking-tight text-gray-900">
          Thanh khoản thị trường
        </h1>
        <p className="m-0 mt-1.5 text-[13.5px] text-gray-400">
          Dữ liệu cập nhật mỗi 5 phút · Tất cả listing trên nền tảng
        </p>
      </div>

      {/* ── Supply KPIs ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Cung — Listing
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Đang hiển thị"
            value={s.activeListings.toLocaleString('vi')}
            sub="Active listings"
            accent
          />
          <KpiCard
            label="Người bán"
            value={s.activeSellers.toLocaleString('vi')}
            sub="Sellers có tin đang chạy"
          />
          <KpiCard
            label="Tin mới 7 ngày"
            value={s.newLast7d}
            sub="Mới tạo"
            accent={s.newLast7d > 0}
          />
          <KpiCard
            label="Tin nháp"
            value={s.draftCount.toLocaleString('vi')}
            sub={draftRate > 0 ? `${draftRate}% chưa đăng` : 'Không có'}
            warn={draftRate > 40}
          />
        </div>
      </section>

      {/* ── Demand KPIs (lead events 30d) ────────────────────────── */}
      <section className="mt-7">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Cầu — Lead Events (30 ngày)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Tổng tương tác"   value={s.leadsTotal.toLocaleString('vi')}    sub="Mọi lead event" />
          <KpiCard label="Yêu cầu xem đất"  value={s.visitRequests.toLocaleString('vi')} sub="request_visit" accent={s.visitRequests > 0} />
          <KpiCard label="Pháp lý"          value={s.legalReviews.toLocaleString('vi')}  sub="legal_review"  accent={s.legalReviews > 0} />
          <KpiCard label="Chat"             value={s.chatClicks.toLocaleString('vi')}    sub="chat_click" />
          <KpiCard label="Cuộc gọi"         value={s.callClicks.toLocaleString('vi')}    sub="call_click" />
        </div>
      </section>

      {/* ── Charts row ───────────────────────────────────────────── */}
      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* Draft → Publish funnel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
          <p className="m-0 mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Phễu đăng tin
          </p>
          <FunnelStep label="Tổng listing" value={totalListings} />
          <FunnelStep
            label="Đang chạy"
            value={s.activeListings}
            sub="status = published"
            pct={publishRate}
          />
          <FunnelStep
            label="Còn nháp"
            value={s.draftCount}
            sub="status = draft"
            pct={draftRate}
            last
          />
          {draftRate > 40 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-700">
              <strong>{draftRate}% tin chưa đăng.</strong> Kích hoạt reminder email để giảm nháp.
            </div>
          )}
        </div>

        {/* New listings last 7d — spark bar */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Tin mới 7 ngày qua
          </p>
          <p className="m-0 mb-4 text-[24px] font-black tabular-nums text-gray-900">
            {s.newLast7d}
            <span className="ml-1.5 text-[13px] font-normal text-gray-400">listing</span>
          </p>
          <SparkBar data={s.daily7d}/>
          <div className="mt-2 flex justify-between">
            <span className="text-[10px] text-gray-300">{s.daily7d[0]?.day?.slice(5) ?? ''}</span>
            <span className="text-[10px] text-gray-300">{s.daily7d[6]?.day?.slice(5) ?? ''}</span>
          </div>
        </div>

        {/* Completeness distribution */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
          <p className="m-0 mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Độ hoàn thiện listing
          </p>
          <div className="flex flex-col gap-3">
            {(['platinum', 'gold', 'silver', 'bronze'] as const).map(tier => {
              const cnt = s.completeness[tier]
              const cfg = TIER_STYLES[tier]!
              const pct = tierTotal > 0 ? Math.round((cnt / tierTotal) * 100) : 0
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`inline-flex w-[70px] shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: tier === 'platinum' ? '#7C3AED' : tier === 'gold' ? '#D97706' : tier === 'silver' ? '#6B7280' : '#C2410C',
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] font-semibold tabular-nums text-gray-600">{pct}%</span>
                </div>
              )
            })}
          </div>
          <p className="m-0 mt-3 text-[11px] text-gray-400">{tierTotal} listing có dữ liệu hoàn thiện</p>
        </div>
      </div>

      {/* ── Province & Land type breakdown ──────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">

        {/* Top provinces */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
          <p className="m-0 mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Top tỉnh (active listings)
          </p>
          <div className="flex flex-col gap-2.5">
            {s.topProvinces.length === 0 ? (
              <p className="text-[13px] text-gray-400">Chưa có dữ liệu</p>
            ) : (
              s.topProvinces.map(p => (
                <HBar key={p.province_name} label={p.province_name} value={p.cnt} max={topProvMax}/>
              ))
            )}
          </div>
        </div>

        {/* Land type breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
          <p className="m-0 mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Loại đất
          </p>
          <div className="flex flex-col gap-2.5">
            {s.landTypes.length === 0 ? (
              <p className="text-[13px] text-gray-400">Chưa có dữ liệu</p>
            ) : (
              s.landTypes.map(lt => (
                <HBar
                  key={lt.land_type}
                  label={LAND_LABELS[lt.land_type] ?? lt.land_type}
                  value={lt.cnt}
                  max={landTypeMax}
                  color="#1B4332"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Growth actions ────────────────────────────────────────── */}
      <section className="mt-7">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Hành động tăng thanh khoản
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/listings/new"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200
                       bg-white px-5 py-4 no-underline transition-colors hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <p className="m-0 text-[13.5px] font-semibold text-gray-800">Đăng tin mới</p>
              <p className="m-0 text-[11.5px] text-gray-400">Tăng cung listing</p>
            </div>
          </Link>

          <Link
            href="/dashboard/listings/import"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200
                       bg-white px-5 py-4 no-underline transition-colors hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <p className="m-0 text-[13.5px] font-semibold text-gray-800">Nhập hàng loạt</p>
              <p className="m-0 text-[11.5px] text-gray-400">CSV upload nhiều tin</p>
            </div>
          </Link>

          <Link
            href="/tin-dang-cua-toi"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200
                       bg-white px-5 py-4 no-underline transition-colors hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <p className="m-0 text-[13.5px] font-semibold text-gray-800">Hoàn thiện tin nháp</p>
              <p className="m-0 text-[11.5px] text-gray-400">{s.draftCount} tin đang chờ đăng</p>
            </div>
          </Link>
        </div>
      </section>

    </div>
  )
}
