import { ShieldCheck, Package, MessageCircle } from 'lucide-react'
import { ProgressBar } from '@/shared/ui/progress-bar'
import type { MerchantTrust } from '../storefront.types'

type Props = Pick<MerchantTrust, 'trust_score' | 'active_listings_count' | 'response_rate'>

interface StatTileProps {
  icon:       React.ReactNode
  value:      React.ReactNode
  label:      string
  iconBg:     string
  iconColor:  string
  progress?:  number
}

function StatTile({ icon, value, label, iconBg, iconColor, progress }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2.5 rounded-2xl bg-[var(--surface)] px-3 py-5 shadow-apple-soft">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="w-full text-center">
        <p className="m-0 text-[1.375rem] font-bold tabular-nums leading-none tracking-tight text-[var(--sea-ink)]">
          {value}
        </p>
        <p className="m-0 mt-1 text-[0.75rem] text-[var(--muted)]">{label}</p>
        {progress != null && (
          <div className="mt-2 px-2">
            <ProgressBar value={progress} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}

export function StoreStats({ trust_score, active_listings_count, response_rate }: Props) {
  const highTrust = trust_score > 90

  return (
    <div className="flex items-stretch gap-3">
      <StatTile
        icon={<ShieldCheck size={18} />}
        value={
          <span style={{ color: highTrust ? 'var(--palm)' : 'var(--sea-ink)' }}>
            {trust_score}
            <span className="text-sm font-normal text-[var(--muted)]">/100</span>
          </span>
        }
        label="Độ uy tín"
        iconBg={highTrust ? 'rgba(52,199,89,0.12)' : 'rgba(142,142,147,0.12)'}
        iconColor={highTrust ? 'var(--palm)' : 'var(--muted)'}
        progress={trust_score}
      />

      <StatTile
        icon={<Package size={18} />}
        value={
          <>
            {active_listings_count}
            <span className="text-sm font-normal text-[var(--muted)]"> sp</span>
          </>
        }
        label="Đang đăng"
        iconBg="rgba(50,173,230,0.12)"
        iconColor="var(--lagoon)"
      />

      <StatTile
        icon={<MessageCircle size={18} />}
        value={
          <>
            {response_rate}
            <span className="text-sm font-normal text-[var(--muted)]">%</span>
          </>
        }
        label="Tỉ lệ phản hồi"
        iconBg="rgba(0,113,227,0.10)"
        iconColor="var(--lagoon-deep)"
      />
    </div>
  )
}
