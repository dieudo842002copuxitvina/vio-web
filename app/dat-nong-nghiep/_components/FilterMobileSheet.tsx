'use client'

import { useState } from 'react'
import { FilterSidebar } from './FilterSidebar'
import type { ProvinceOption } from '@/features/search/api/land-search.server'

interface Props {
  provinces: ProvinceOption[]
  activeCount: number
}

export function FilterMobileSheet({ provinces, activeCount }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-[rgba(60,60,67,0.2)] bg-white px-4 py-2 text-[14px] font-medium text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Bộ lọc
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A4D2E] text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Sheet overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[88svh] overflow-y-auto rounded-t-[20px] bg-[#F2F2F7] p-6 pb-10 shadow-[0_-8px_40px_rgba(0,0,0,0.15)]">
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[rgba(60,60,67,0.3)]" />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#1d1d1f]">Bộ lọc tìm kiếm</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(120,120,128,0.16)] text-[#1d1d1f]"
                aria-label="Đóng bộ lọc"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <FilterSidebar provinces={provinces} />

            {/* Apply button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-[12px] bg-[#1A4D2E] py-3.5 text-[15px] font-semibold text-white"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </>
      )}
    </>
  )
}
