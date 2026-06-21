'use client'

import { useState, useTransition }   from 'react'
import { importFromGoogleSheets }     from '@/app/actions/bulk-import.server'
import type { BulkImportResult }      from '@/app/actions/bulk-import.server'
import Link                           from 'next/link'

// ── ResultSummary (inline, same as BulkImportForm) ────────────────────────────

function ResultSummary({ result }: { result: BulkImportResult }) {
  const failedRows = result.rows.filter(r => !r.success)
  return (
    <div className="space-y-5">
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

      {result.imported > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-[13px] font-semibold text-amber-700">
              {result.imported} tin đã lưu dưới dạng <strong>nháp</strong>.
            </p>
            <p className="mt-0.5 text-[12px] text-amber-600">
              Vào Tin đăng của tôi để bổ sung ảnh, GPS rồi đăng tin.
            </p>
          </div>
        </div>
      )}

      {failedRows.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-red-600">Dòng thất bại</p>
          <ul className="space-y-1">
            {failedRows.map(r => (
              <li key={r.rowIndex} className="text-[12.5px] text-red-600">
                Dòng {r.rowIndex}: {r.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tin-dang-cua-toi"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-vio-forest px-6
                     text-[14px] font-bold text-white no-underline hover:opacity-90"
        >
          Xem tin nháp →
        </Link>
      </div>
    </div>
  )
}

// ── SheetsImportForm ──────────────────────────────────────────────────────────

export function SheetsImportForm() {
  const [url,    setUrl]    = useState('')
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [error,  setError]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    startTransition(async () => {
      const res = await importFromGoogleSheets(url.trim())
      if (!res.success) {
        setError(res.error ?? 'Lỗi nhập liệu.')
      } else {
        setResult(res.result!)
      }
    })
  }

  if (result) return <ResultSummary result={result}/>

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Instructions */}
      <div className="rounded-2xl border border-neutral-100 bg-[#F5F5F7] p-5">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-400">
          Cách dùng
        </p>
        <ol className="m-0 space-y-1.5 pl-5 text-[13px] text-neutral-600">
          <li>Mở Google Sheet chứa dữ liệu với các cột theo định dạng CSV mẫu</li>
          <li>Vào <strong>File → Share → Share with others</strong> → chọn <em>Anyone with the link</em> can view</li>
          <li>Copy link và dán vào ô bên dưới</li>
        </ol>
      </div>

      {/* URL input */}
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-[#1d1d1f]">
          Link Google Sheets
        </label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          required
          className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-[14px]
                     outline-none transition-colors focus:border-vio-forest/50
                     placeholder:text-neutral-400"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !url.trim()}
        className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-vio-forest
                   text-[14px] font-bold text-white transition-opacity hover:opacity-90
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Đang tải dữ liệu…' : 'Nhập từ Google Sheets'}
      </button>

    </form>
  )
}
