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

  // Get the user's business id
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

const STATUS_GROUPS: { status: Booking['status']; label: string; color: string }[] = [
  { status: 'pending',   label: 'Chờ xác nhận', color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40' },
  { status: 'confirmed', label: 'Đã xác nhận',  color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/40' },
  { status: 'completed', label: 'Đã hoàn thành', color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/40' },
]

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-white/[0.08]">
      <p className="m-0 text-sm text-gray-400">Không có lịch hẹn nào trong cột "{label}"</p>
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
        <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Bảng điều khiển
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Quản lý lịch hẹn
        </h1>
        {bookings.length > 0 && (
          <p className="m-0 mt-1.5 text-[0.9375rem] text-gray-500">
            {bookings.length} lịch hẹn tổng cộng
          </p>
        )}
      </header>

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATUS_GROUPS.map(({ status, label, color }) => (
          <div key={status}>
            {/* Column header */}
            <div className={`mb-3 flex items-center gap-2.5 rounded-2xl border px-4 py-3 ${color}`}>
              <span className="text-[0.875rem] font-bold text-gray-800 dark:text-gray-200">{label}</span>
              <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-[0.75rem] font-bold text-gray-700 dark:bg-black/30 dark:text-gray-300">
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
          <summary className="cursor-pointer select-none text-[0.875rem] font-semibold text-gray-400 hover:text-gray-600">
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
