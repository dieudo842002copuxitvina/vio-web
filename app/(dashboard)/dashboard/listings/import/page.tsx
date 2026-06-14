import type { Metadata } from 'next'
import { redirect }       from 'next/navigation'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import { BulkImportForm } from './_components/BulkImportForm'
import { SheetsImportForm } from './_components/SheetsImportForm'

export const metadata: Metadata = {
  title: 'Nhập hàng loạt — VIO AGRI',
  robots: { index: false, follow: false },
}

const TABS = [
  { id: 'csv',    label: 'CSV' },
  { id: 'excel',  label: 'Excel (.xlsx)' },
  { id: 'sheets', label: 'Google Sheets' },
]

export default async function BulkImportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap?next=/dashboard/listings/import')

  const params     = await searchParams
  const activeTab  = TABS.some(t => t.id === params.tab) ? (params.tab ?? 'csv') : 'csv'

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/tin-dang-cua-toi"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-400
                     no-underline transition-colors hover:text-neutral-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Tin đăng của tôi
        </Link>
        <h1 className="text-[1.75rem] font-black tracking-tight text-[#1d1d1f]">
          Nhập tin đăng hàng loạt
        </h1>
        <p className="mt-1.5 text-[14px] text-neutral-500">
          Import từ CSV, Excel hoặc Google Sheets. Tất cả tin sẽ được lưu dưới dạng nháp và chờ duyệt.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-neutral-100 bg-[#F5F5F7] p-1">
        {TABS.map(tab => (
          <Link
            key={tab.id}
            href={`?tab=${tab.id}`}
            className={[
              'flex-1 rounded-xl px-4 py-2.5 text-center text-[13px] font-semibold no-underline transition-all',
              activeTab === tab.id
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Column spec — only for CSV/Excel tabs */}
      {activeTab !== 'sheets' && (
        <div className="mb-8 rounded-2xl border border-neutral-100 bg-[#F5F5F7] p-5">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Cột bắt buộc &amp; tuỳ chọn
          </p>
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            {[
              { col: 'title',            req: true,  label: 'Tiêu đề' },
              { col: 'province_name',    req: true,  label: 'Tỉnh thành' },
              { col: 'price_text',       req: false, label: 'Giá' },
              { col: 'transaction_type', req: false, label: 'Loại GD' },
              { col: 'land_type',        req: false, label: 'Loại đất' },
              { col: 'area_m2',          req: false, label: 'Diện tích' },
              { col: 'legal_status',     req: false, label: 'Pháp lý' },
              { col: 'road_access',      req: false, label: 'Đường vào' },
              { col: 'water_source',     req: false, label: 'Nguồn nước' },
              { col: 'electricity',      req: false, label: 'Điện' },
              { col: 'current_crops',    req: false, label: 'Hiện trạng' },
              { col: 'description',      req: false, label: 'Mô tả' },
            ].map(({ col, req, label }) => (
              <span key={col} className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium',
                req
                  ? 'border border-vio-forest/30 bg-vio-forest/8 text-vio-forest'
                  : 'border border-neutral-200 bg-white text-neutral-500',
              ].join(' ')}>
                <code className="font-mono">{col}</code>
                {req && <span className="font-bold text-vio-forest">*</span>}
                <span className="text-neutral-400">· {label}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-neutral-400">
            Tối đa 500 dòng mỗi lần nhập.
            {activeTab === 'excel' && ' Hỗ trợ .xlsx và .xls — sử dụng cùng tên cột như CSV mẫu.'}
          </p>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'sheets'
        ? <SheetsImportForm/>
        : <BulkImportForm excelMode={activeTab === 'excel'}/>
      }

    </div>
  )
}
