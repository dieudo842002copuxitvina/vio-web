import Link from 'next/link'
import type {
  MarketEvent,
  MarketEventType,
  EventSeverity,
  InventoryPressure,
} from '@/features/commerce/api/regional-ops.server'
import { CATEGORY_LABEL, CATEGORY_ICON } from './CategoryIntelligence'

// ── Event display config ──────────────────────────────────────────────────────

const EVENT_META: Record<MarketEventType, {
  icon:   string
  label:  string
  border: string
  bg:     string
  text:   string
}> = {
  demand_spike:       { icon: '📈', label: 'Nhu cầu tăng đột biến',  border: 'border-green-200',  bg: 'bg-green-50',  text: 'text-green-700'  },
  shortage_alert:     { icon: '🚨', label: 'Thiếu hàng',             border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700'    },
  oversupply_warning: { icon: '📦', label: 'Cảnh báo dư cung',       border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  new_market_opened:  { icon: '🆕', label: 'Thị trường mới mở',      border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700' },
  seasonal_peak:      { icon: '🌱', label: 'Đỉnh mùa vụ',            border: 'border-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-700'  },
  price_anomaly:      { icon: '💰', label: 'Giá bất thường',          border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
  high_liquidity:     { icon: '💧', label: 'Thanh khoản cao',         border: 'border-cyan-200',   bg: 'bg-cyan-50',   text: 'text-cyan-700'   },
  trust_drop:         { icon: '⚠️', label: 'Cảnh báo uy tín',        border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700' },
}

const SEVERITY_RING: Record<EventSeverity, string> = {
  low:      '',
  medium:   '',
  high:     'ring-2 ring-orange-300',
  critical: 'ring-2 ring-red-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (hours < 1)  return 'vừa phát hiện'
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

// ── EventAlertCard ────────────────────────────────────────────────────────────

function EventAlertCard({ event }: { event: MarketEvent }) {
  const meta = EVENT_META[event.event_type]
  if (!meta) return null

  const catLabel = event.category_id ? (CATEGORY_LABEL[event.category_id] ?? `Danh mục ${event.category_id}`) : null
  const catIcon  = event.category_id ? (CATEGORY_ICON[event.category_id]  ?? '🌾') : null
  const ring     = SEVERITY_RING[event.severity]

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border p-5 shadow-sm',
        meta.bg, meta.border, ring,
      ].join(' ')}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-lg"
                aria-hidden="true">
            {meta.icon}
          </span>
          <div>
            <p className={`m-0 text-[0.875rem] font-bold ${meta.text}`}>{meta.label}</p>
            {catLabel && (
              <p className="m-0 mt-0.5 text-[0.75rem] text-neutral-500">
                {catIcon} {catLabel}
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-white/60 ${meta.text}`}>
          {event.severity === 'critical' ? '🔴 Khẩn cấp' :
           event.severity === 'high'     ? '🟠 Cao' :
           event.severity === 'medium'   ? '🟡 Trung bình' : '⚪ Thấp'}
        </span>
      </div>

      {/* Values */}
      {(event.trigger_value != null || event.baseline_value != null) && (
        <div className="mb-3 flex items-center gap-4 rounded-xl bg-white/50 px-3 py-2">
          {event.trigger_value != null && (
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Hiện tại</p>
              <p className={`m-0 text-[0.9375rem] font-black ${meta.text}`}>
                {event.trigger_value.toFixed(1)}
              </p>
            </div>
          )}
          {event.baseline_value != null && (
            <>
              <div className="h-8 w-px bg-neutral-200" />
              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Bình thường</p>
                <p className="m-0 text-[0.9375rem] font-black text-neutral-500">
                  {event.baseline_value.toFixed(1)}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <p className="text-[0.6875rem] text-neutral-400">{timeAgo(event.detected_at)}</p>
        <Link
          href={`/dat-nong-nghiep${event.category_id ? `?category=${event.category_id}` : ''}`}
          className={`text-[0.8125rem] font-bold no-underline ${meta.text} hover:opacity-75 transition-opacity`}
        >
          {event.event_type === 'shortage_alert' ? 'Đăng tin ngay →' : 'Xem chi tiết →'}
        </Link>
      </div>
    </div>
  )
}

// ── ShortageCard — from InventoryPressure ─────────────────────────────────────

function ShortageCard({ item }: { item: InventoryPressure }) {
  const catLabel = CATEGORY_LABEL[item.category_id] ?? `Danh mục ${item.category_id}`
  const catIcon  = CATEGORY_ICON[item.category_id]  ?? '🌾'
  const urgency  = item.pressure_score < -0.6 ? 'critical' : item.pressure_score < -0.4 ? 'high' : 'medium'
  const color    = urgency === 'critical' ? 'border-red-300 bg-red-50' :
                   urgency === 'high'     ? 'border-orange-200 bg-orange-50' :
                                           'border-amber-200 bg-amber-50'
  const textCol  = urgency === 'critical' ? 'text-red-700' :
                   urgency === 'high'     ? 'text-orange-700' : 'text-amber-700'

  return (
    <div className={`flex flex-col rounded-2xl border p-5 shadow-sm ${color}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-lg"
                aria-hidden="true">
            {catIcon}
          </span>
          <div>
            <p className={`m-0 text-[0.875rem] font-bold ${textCol}`}>Thiếu hàng: {catLabel}</p>
            <p className="m-0 mt-0.5 text-[0.75rem] text-neutral-500">
              Cầu vượt cung · {item.inquiries_7d} hỏi thăm / tuần
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/60 ${textCol}`}>
          {urgency === 'critical' ? '🔴 Cấp thiết' : urgency === 'high' ? '🟠 Khẩn' : '🟡 Cần thiết'}
        </span>
      </div>

      {/* Supply vs demand */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/50 px-3 py-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Tin đăng hiện có</p>
          <p className={`m-0 text-[0.9375rem] font-black ${textCol}`}>{item.active_listing_count}</p>
        </div>
        <div className="rounded-xl bg-white/50 px-3 py-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Tồn kho ước tính</p>
          <p className={`m-0 text-[0.9375rem] font-black ${textCol}`}>
            {item.days_supply != null ? `${Math.round(item.days_supply)} ngày` : '< 7 ngày'}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-1">
        <p className={`text-[0.6875rem] font-semibold ${textCol} opacity-70`}>
          Cơ hội cho người bán
        </p>
        <Link
          href="/dang-tin"
          className={`text-[0.8125rem] font-bold no-underline ${textCol} hover:opacity-75 transition-opacity`}
        >
          Đăng tin ngay →
        </Link>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface OpportunityAlertsProps {
  events:   MarketEvent[]
  pressure: InventoryPressure[]
}

export function OpportunityAlerts({ events, pressure }: OpportunityAlertsProps) {
  const shortages = pressure.filter(p => p.shortage_flag)

  // Filter out shortage events already covered by inventory pressure cards
  const filteredEvents = events.filter(e =>
    e.event_type !== 'shortage_alert' || !shortages.some(s => s.category_id === e.category_id)
  )

  const allCards = [
    ...shortages.map(s => ({ type: 'shortage' as const, data: s, key: `s-${s.category_id}` })),
    ...filteredEvents.map(e => ({ type: 'event'    as const, data: e, key: `e-${e.id}` })),
  ].slice(0, 6)

  if (!allCards.length) return null

  return (
    <section
      className="bg-white px-4 sm:px-6 lg:px-8 py-16 md:py-20"
      aria-labelledby="alerts-heading"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-red-500">
              Tín hiệu thị trường
            </p>
            <h2
              id="alerts-heading"
              className="m-0 mt-1 text-2xl font-black tracking-tight text-[#0A0A0A] sm:text-3xl"
            >
              Cơ hội & Cảnh báo
            </h2>
            <p className="m-0 mt-1 text-[0.9375rem] text-neutral-500">
              Phát hiện tự động từ biến động cung cầu thị trường địa phương
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allCards.map(card =>
            card.type === 'shortage'
              ? <ShortageCard key={card.key} item={card.data as InventoryPressure} />
              : <EventAlertCard key={card.key} event={card.data as MarketEvent} />
          )}
        </div>
      </div>
    </section>
  )
}
