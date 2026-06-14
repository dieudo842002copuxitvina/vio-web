import type { Metadata }   from 'next'
import { createClient }    from '@/lib/supabase/server'
import { BookingCard }     from './_components/booking-card'

export const revalidate = 0
export const metadata: Metadata = { title: 'Quản lý lịch hẹn | VIO LOCAL' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id:           string
  booking_date: string
  time_slot:    string | null
  notes:        string | null
  status:       'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at:   string
  customer: {
    full_name: string | null
    phone:     string | null
  } | null
  service: {
    title: string
  } | null
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getBookings(): Promise<Booking[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: sf } = await supabase
    .from('storefronts')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!sf) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, booking_date, time_slot, notes, status, created_at,
      customer:profiles!bookings_customer_id_fkey(full_name, phone),
      service:business_services!bookings_service_id_fkey(title)
    `)
    .eq('business_id', (sf as { id: string }).id)
    .order('booking_date', { ascending: true })

  return (data ?? []) as unknown as Booking[]
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const STATUS_GROUPS: {
  status: Booking['status']
  label: string
  headerCls: string
  badgeCls: string
}[] = [
  {
    status: 'pending',
    label: 'Chờ xác nhận',
    headerCls: 'bg-vio-amber/[0.07] border-vio-amber/20',
    badgeCls: 'text-amber-700 dark:text-amber-400',
  },
  {
    status: 'confirmed',
    label: 'Đã xác nhận',
    headerCls: 'bg-vio-blue/[0.07] border-vio-blue/20',
    badgeCls: 'text-vio-blue dark:text-[#409CFF]',
  },
  {
    status: 'completed',
    label: 'Đã hoàn thành',
    headerCls: 'bg-vio-primary/[0.07] border-vio-primary/20',
    badgeCls: 'text-vio-forest dark:text-vio-primary',
  },
]

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--line)] p-8 text-center">
      <p className="m-0 text-sm text-[var(--muted)]">Không có lịch hẹn nào trong cột &ldquo;{label}&rdquo;</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function QuanLyLichHenPage() {
  const bookings = await getBookings()

  const grouped = STATUS_GROUPS.reduce<Record<string, Booking[]>>((acc, g) => {
    acc[g.status] = bookings.filter(b => b.status === g.status)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <p className="m-0 mb-1 section-kicker text-[var(--muted)]">
          Bảng điều khiển
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
          Quản lý lịch hẹn
        </h1>
        {bookings.length > 0 && (
          <p className="m-0 mt-1.5 text-[0.9375rem] text-[var(--sea-ink-soft)]">
            {bookings.length} lịch hẹn tổng cộng
          </p>
        )}
      </header>

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATUS_GROUPS.map(({ status, label, headerCls, badgeCls }) => (
          <div key={status}>
            {/* Column header */}
            <div className={`mb-3 flex items-center gap-2.5 rounded-2xl border px-4 py-3 ${headerCls}`}>
              <span className={`text-[0.875rem] font-bold text-[var(--sea-ink)] ${badgeCls}`}>{label}</span>
              <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-[0.75rem] font-bold text-[var(--sea-ink-soft)] dark:bg-black/30">
                {grouped[status]?.length ?? 0}
              </span>
            </div>

            {/* Booking cards */}
            <div className="flex flex-col gap-3">
              {grouped[status]?.length === 0
                ? <EmptyColumn label={label} />
                : grouped[status].map(b => (
                    <BookingCard key={b.id} booking={b} />
                  ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Cancelled — collapsed at bottom */}
      {bookings.some(b => b.status === 'cancelled') && (
        <details className="mt-8">
          <summary className="cursor-pointer select-none text-[0.875rem] font-semibold text-[var(--muted)] hover:text-[var(--sea-ink-soft)]">
            Đã hủy ({bookings.filter(b => b.status === 'cancelled').length})
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {bookings
              .filter(b => b.status === 'cancelled')
              .map(b => <BookingCard key={b.id} booking={b} />)
            }
          </div>
        </details>
      )}
    </div>
  )
}
