'use client'

import { useState, useRef, useCallback }   from 'react'
import Link                                 from 'next/link'
import { parseBulkCSV, bulkImportListings } from '@/app/actions/bulk-import.server'
import type { BulkImportRow, BulkImportResult } from '@/app/actions/bulk-import.server'

const CSV_TEMPLATE_HEADERS =
  'title,province_name,price_text,transaction_type,land_type,area_m2,legal_status,road_access,water_source,electricity,current_crops,description'

const CSV_TEMPLATE_EXAMPLE =
  `${CSV_TEMPLATE_HEADERS}\n` +
  `"Bán 5ha đất cây lâu năm tại Đắk Lắk","Đắk Lắk","3,5 tỷ","ban","cay_lau_nam","50000","Sổ đỏ","Đường nhựa","Giếng khoan","Điện 3 pha","Cà phê","Vườn cà phê đang thu hoạch, năng suất 3 tấn/ha"\n` +
  `"Cho thuê ao nuôi tôm 3ha tại Cà Mau","Cà Mau","50 triệu/năm","cho_thue","mat_nuoc","30000","Sổ đỏ","Đường đất","Kênh rạch","Điện 3 pha","Tôm thẻ","Hệ thống ao nuôi tôm đang hoạt động"`

// ─────────────────────────────────────────────────────────────────────────────
// State machine: idle → parsing → preview → importing → done | error
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const LAND_LABELS: Record<string, string> = {
  lua: 'Lúa', rau_mau: 'Rau màu', cay_lau_nam: 'Cây lâu năm',
  cay_an_trai: 'Cây ăn trái', lam_nghiep: 'Lâm nghiệp',
  mat_nuoc: 'Mặt nước', hon_hop: 'Hỗn hợp',
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'vio_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewTable
// ─────────────────────────────────────────────────────────────────────────────

function PreviewTable({ rows, parseErrors }: { rows: BulkImportRow[]; parseErrors: { rowIndex: number; message: string }[] }) {
  return (
    <div className="space-y-4">

      {parseErrors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-red-600">
            {parseErrors.length} dòng bị lỗi — sẽ bị bỏ qua
          </p>
          <ul className="space-y-1">
            {parseErrors.map(e => (
              <li key={e.rowIndex} className="text-[12.5px] text-red-600">
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  {['#', 'Tiêu đề', 'Tỉnh', 'Giá', 'Loại đất', 'Diện tích'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.rowIndex} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50">
                    <td className="px-4 py-2.5 text-neutral-400">{r.rowIndex}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 font-medium text-[#1d1d1f]">
                      {r.title}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{r.province_name}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{r.price_text ?? '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {r.land_type ? (LAND_LABELS[r.land_type] ?? r.land_type) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{r.area_m2 ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultSummary
// ─────────────────────────────────────────────────────────────────────────────

function ResultSummary({ result }: { result: BulkImportResult }) {
  const failedRows = result.rows.filter(r => !r.success)

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-green-600">Đã nhập</p>
          <p className="mt-1 text-[2rem] font-black text-green-700 leading-none">{result.imported}</p>
        </div>
        {result.failed > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-red-600">Thất bại</p>
            <p className="mt-1 text-[2rem] font-black text-red-700 leading-none">{result.failed}</p>
          </div>
        )}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-400">Tổng</p>
          <p className="mt-1 text-[2rem] font-black text-neutral-700 leading-none">{result.rows.length}</p>
        </div>
      </div>

      {/* Status: all drafts — prompt to review */}
      {result.imported > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-amber-600">
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <div>
            <p className="text-[13px] font-semibold text-amber-700">
              {result.imported} tin đã lưu dưới dạng <strong>nháp</strong>.
            </p>
            <p className="mt-0.5 text-[12px] text-amber-600">
              Vào Tin đăng của tôi để bổ sung ảnh, GPS, thông tin nông nghiệp rồi đăng tin.
            </p>
          </div>
        </div>
      )}

      {/* Failed rows detail */}
      {failedRows.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-red-600">
            Dòng nhập thất bại
          </p>
          <ul className="space-y-1">
            {failedRows.map(r => (
              <li key={r.rowIndex} className="text-[12.5px] text-red-600">
                Dòng {r.rowIndex}: {r.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/tin-dang-cua-toi"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-vio-forest px-6
                     text-[14px] font-bold text-white no-underline transition-opacity hover:opacity-90"
        >
          Xem tin nháp đã nhập →
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200
                     px-6 text-[14px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          Nhập thêm file khác
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkImportForm (main export)
// ─────────────────────────────────────────────────────────────────────────────

export function BulkImportForm({ excelMode = false }: { excelMode?: boolean }) {
  const [phase,        setPhase]        = useState<Phase>('idle')
  const [csvText,      setCsvText]      = useState('')
  const [previewRows,  setPreviewRows]  = useState<BulkImportRow[]>([])
  const [parseErrors,  setParseErrors]  = useState<{ rowIndex: number; message: string }[]>([])
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [globalError,  setGlobalError]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setPhase('parsing')
    setGlobalError(null)

    let text: string

    // Excel: use SheetJS to convert to CSV-like rows, then re-serialize as CSV
    if (file.name.match(/\.xlsx?$/i)) {
      try {
        const { read, utils } = await import('xlsx')
        const buffer  = await file.arrayBuffer()
        const wb      = read(buffer, { type: 'array' })
        const sheet   = wb.Sheets[wb.SheetNames[0]!]!
        const rows    = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (rows.length === 0) {
          setGlobalError('File Excel không có dữ liệu.')
          setPhase('error')
          return
        }
        const headers = Object.keys(rows[0]!)
        const csvRows = [
          headers.join(','),
          ...rows.map(r =>
            headers.map(h => {
              const v = String(r[h] ?? '').replace(/"/g, '""')
              return v.includes(',') ? `"${v}"` : v
            }).join(','),
          ),
        ]
        text = csvRows.join('\n')
      } catch {
        setGlobalError('Không thể đọc file Excel. Vui lòng thử lại hoặc chuyển sang CSV.')
        setPhase('error')
        return
      }
    } else {
      text = await file.text()
    }

    setCsvText(text)
    const { rows, errors } = await parseBulkCSV(text)
    setPreviewRows(rows)
    setParseErrors(errors)
    setPhase('preview')
  }, [])

  async function handleImport() {
    if (previewRows.length === 0) return
    setPhase('importing')
    setGlobalError(null)

    const res = await bulkImportListings(csvText)
    if (!res.success) {
      setGlobalError(res.error ?? 'Lỗi nhập liệu.')
      setPhase('error')
      return
    }
    setImportResult(res.result!)
    setPhase('done')
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (phase === 'idle' || phase === 'parsing') {
    return (
      <div className="space-y-6">

        {/* Template download */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-white p-5">
          <div>
            <p className="text-[14px] font-bold text-[#1d1d1f]">Tải file mẫu CSV</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Điền vào file mẫu rồi upload lên đây để nhập hàng loạt.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white
                       px-4 py-2 text-[13px] font-semibold text-neutral-600
                       transition-colors hover:bg-neutral-50 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Tải mẫu CSV
          </button>
        </div>

        {/* Drop zone */}
        <label
          htmlFor="csv-upload"
          onDragOver={e => { e.preventDefault() }}
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) void handleFile(file)
          }}
          className={[
            'flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed',
            'border-neutral-200 bg-white p-12 text-center',
            'cursor-pointer transition-colors hover:border-vio-forest/40 hover:bg-vio-forest/[0.02]',
            phase === 'parsing' ? 'pointer-events-none opacity-50' : '',
          ].join(' ')}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.75"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75"/>
              <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1d1d1f]">
              {phase === 'parsing'
                ? 'Đang phân tích…'
                : excelMode ? 'Kéo & thả file Excel vào đây' : 'Kéo & thả file CSV vào đây'}
            </p>
            <p className="mt-1 text-[13px] text-neutral-400">
              {excelMode
                ? 'Hỗ trợ .xlsx và .xls · Tối đa 500 dòng'
                : 'Hoặc nhấp để chọn file · Tối đa 500 dòng'}
            </p>
          </div>
          <input
            ref={fileRef}
            id="csv-upload"
            type="file"
            accept={excelMode ? '.xlsx,.xls' : '.csv,text/csv'}
            className="sr-only"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
        </label>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  if (phase === 'preview') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#1d1d1f]">
              {previewRows.length} dòng hợp lệ
              {parseErrors.length > 0 && ` · ${parseErrors.length} dòng lỗi`}
            </p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Kiểm tra dữ liệu trước khi nhập. Tất cả tin sẽ được lưu dưới dạng nháp.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setCsvText('') }}
            className="text-[13px] font-semibold text-neutral-400 hover:text-neutral-700"
          >
            Chọn file khác
          </button>
        </div>

        <PreviewTable rows={previewRows} parseErrors={parseErrors}/>

        {previewRows.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleImport()}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-vio-forest
                         px-8 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Nhập {previewRows.length} tin nháp
            </button>
            <button
              type="button"
              onClick={() => { setPhase('idle'); setCsvText('') }}
              className="text-[13px] font-semibold text-neutral-400 hover:text-neutral-700"
            >
              Huỷ
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Importing ─────────────────────────────────────────────────────────────

  if (phase === 'importing') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-vio-forest/20 border-t-vio-forest"/>
        <p className="text-[14px] font-semibold text-neutral-600">
          Đang nhập {previewRows.length} tin đăng…
        </p>
        <p className="text-[12.5px] text-neutral-400">Vui lòng không đóng trang này.</p>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (phase === 'done' && importResult) {
    return <ResultSummary result={importResult}/>
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="font-semibold text-red-700">Có lỗi xảy ra</p>
      <p className="mt-1 text-[13px] text-red-600">{globalError}</p>
      <button
        type="button"
        onClick={() => { setPhase('idle'); setGlobalError(null) }}
        className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50"
      >
        Thử lại
      </button>
    </div>
  )
}
