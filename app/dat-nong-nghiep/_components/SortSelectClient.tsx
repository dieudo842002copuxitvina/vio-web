'use client'

// ── SortSelectClient ──────────────────────────────────────────────────────────
// Phải là Client Component vì dùng onChange (event handler) + window.location.
// Được import từ app/dat-nong-nghiep/page.tsx (Server Component).
//
// Bug gốc: SortSelect được định nghĩa inline trong file Server Component
// → Next.js ném lỗi "Event handlers cannot be passed to Client Component props"
// → Toàn bộ trang /dat-nong-nghiep bị crash.
//
// Fix: tách ra file riêng với 'use client' directive.

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Mới nhất'      },
  { value: 'price_asc',  label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất'  },
] as const

interface SortSelectClientProps {
  current: string
}

export function SortSelectClient({ current }: SortSelectClientProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href)
    url.searchParams.set('sap_xep', e.target.value)
    url.searchParams.delete('trang') // reset về trang 1 khi đổi sort
    window.location.href = url.toString()
  }

  return (
    <select
      name="sap_xep"
      defaultValue={current || 'newest'}
      aria-label="Sắp xếp kết quả"
      onChange={handleChange}
      className="rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-1.5
                 text-[13px] font-medium text-[#1d1d1f]
                 focus:border-[#1A4D2E] focus:outline-none"
    >
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
