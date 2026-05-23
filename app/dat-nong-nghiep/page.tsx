import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Đất nông nghiệp toàn quốc',
  description: 'Mua bán và cho thuê đất nông nghiệp trên toàn 63 tỉnh thành Việt Nam. Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.',
  alternates: { canonical: '/dat-nong-nghiep' },
}

interface ProvRow { id: number; name: string; slug: string }

async function getProvinces(): Promise<ProvRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .order('name', { ascending: true })
  return (data ?? []) as ProvRow[]
}

export default async function LandIndexPage() {
  const provinces = await getProvinces()

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-20">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-8">
        <Link href="/" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
          Trang chủ
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Đất nông nghiệp</span>
      </nav>

      <header className="mb-8">
        <span className="inline-flex items-center mb-3 px-3 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase">
          Thị trường đất đai
        </span>
        <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-tight">
          Đất nông nghiệp toàn quốc
        </h1>
        <p className="mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          Chọn tỉnh thành để xem danh sách đất nông nghiệp tại khu vực đó.
        </p>
      </header>

      {provinces.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 list-none m-0 p-0">
          {provinces.map(p => (
            <li key={p.id}>
              <Link
                href={`/dat-nong-nghiep/${p.slug}`}
                className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_4px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)] text-[0.9375rem] font-medium text-gray-700 dark:text-gray-200 no-underline transition-[box-shadow,transform] duration-200 hover:shadow-[0_2px_8px_rgb(0,0,0,0.12)] hover:scale-[1.02]"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl opacity-20 mb-5 select-none" aria-hidden="true">🌾</span>
          <p className="text-gray-500 text-[0.9375rem]">Chưa có dữ liệu tỉnh thành.</p>
        </div>
      )}
    </main>
  )
}
