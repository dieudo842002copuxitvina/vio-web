import { FilterPill }   from '@/shared/ui/filter-pill'
import { SectionHeader } from '@/shared/ui/section-header'

const DEFAULT_TRENDS = [
  'Đất điều Bình Phước',
  'Vườn sầu riêng Đồng Nai',
  'Trang trại Lâm Đồng',
  'Đất cao su Tây Ninh',
  'Nông sản Đắk Lắk',
  'Đất lúa An Giang',
  'Vườn tiêu Gia Lai',
  'Cà phê Đắk Nông',
]

interface SearchTrendsProps {
  queries?: string[]
}

export function SearchTrends({ queries }: SearchTrendsProps) {
  const terms = queries && queries.length >= 3 ? queries : DEFAULT_TRENDS

  return (
    <section className="border-t border-[var(--line)] bg-[var(--bg-base)] px-4 section-y">
      <div className="mx-auto max-w-7xl">

        <SectionHeader
          kicker="Tìm kiếm phổ biến"
          kickerColor="text-vio-amber"
          title="Xu hướng tìm kiếm"
          className="mb-6"
        />

        <div className="flex flex-wrap gap-2">
          {terms.map(q => (
            <FilterPill
              key={q}
              label={q}
              href={`/dat-nong-nghiep?q=${encodeURIComponent(q)}`}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
