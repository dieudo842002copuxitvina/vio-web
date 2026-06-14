import Link from 'next/link'
import type { ReactNode } from 'react'

// ── Category data ──────────────────────────────────────────────────────────────

const CATEGORIES: {
  label:    string
  sub:      string
  param:    string
  gradient: string
  icon:     ReactNode
}[] = [
  {
    label:    'Đất trồng lúa',
    sub:      'LUK, LUC, LUN',
    param:    'lua',
    gradient: 'linear-gradient(135deg,#1A4D2E 0%,#2D7A4F 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 24V10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 18c-3-1-5-4-5-7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 18c3-1 5-4 5-7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 13c-2-.5-3.5-2.5-3.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M14 13c2-.5 3.5-2.5 3.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="14" cy="4.5" r="1.2" fill="white"/>
      </svg>
    ),
  },
  {
    label:    'Đất cây hàng năm',
    sub:      'HNK, MNC, NHK',
    param:    'rau-mau',
    gradient: 'linear-gradient(135deg,#1B3F1C 0%,#3A7A3D 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 24v-8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 16c-4-1.5-6-5-5-9 4 0 7 3 5 9z" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
        <path d="M14 19c2-2 5-2.5 7-1-1 3-4.5 4-7 1z" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label:    'Đất cây lâu năm',
    sub:      'CLN, LNC',
    param:    'cay-lau-nam',
    gradient: 'linear-gradient(135deg,#0D2E1A 0%,#1A6B3A 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 24v-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 18c-4-2-6-6-4-10 4 1 6 5.5 4 10z" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
        <path d="M14 18c4-2 6-6 4-10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="14" cy="6" r="4" stroke="white" strokeWidth="1.7"/>
      </svg>
    ),
  },
  {
    label:    'Rừng sản xuất',
    sub:      'RSX, RPH, RDD',
    param:    'lam-nghiep',
    gradient: 'linear-gradient(135deg,#0A2010 0%,#1D5C32 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M7 22h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M10 22v-4M14 22v-6M18 22v-4" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
        <path d="M14 16L9 10h10l-5 6z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
        <path d="M14 11L10 6h8l-4 5z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
      </svg>
    ),
  },
  {
    label:    'Nuôi trồng thủy sản',
    sub:      'NTS, MNS',
    param:    'mat-nuoc',
    gradient: 'linear-gradient(135deg,#0A2E3D 0%,#0E6E9F 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M4 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M18 10c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 1.5.8 2.8 2 3.5h4c1.2-.7 2-2 2-3.5z" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label:    'Đất làm muối',
    sub:      'LMU',
    param:    'muoi',
    gradient: 'linear-gradient(135deg,#2E2A1A 0%,#7A6F2D 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="6" y="14" width="16" height="8" rx="1" stroke="white" strokeWidth="1.7"/>
        <path d="M10 14v-2c0-2.2 1.8-4 4-4s4 1.8 4 4v2" stroke="white" strokeWidth="1.7"/>
        <path d="M10 18h8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="14" cy="8" r="1.2" fill="white"/>
      </svg>
    ),
  },
  {
    label:    'Trang trại',
    sub:      'Đất nông nghiệp tổng hợp',
    param:    'trang-trai',
    gradient: 'linear-gradient(135deg,#3D2200 0%,#8B4B0A 100%)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 22h20" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M6 22v-8l8-6 8 6v8" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
        <path d="M11 22v-5h6v5" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M14 8V6M11 9.5L9.5 8M17 9.5l1.5-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

// ── CategoryCard ───────────────────────────────────────────────────────────────

function CategoryCard({
  label, sub, param, gradient, icon,
}: typeof CATEGORIES[number]) {
  return (
    <Link
      href={`/dat-nong-nghiep?loai=${param}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[18px] p-5 aspect-[4/3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4D2E]"
      style={{ background: gradient }}
    >
      {/* Icon */}
      <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/15 backdrop-blur-sm">
        {icon}
      </div>

      {/* Text */}
      <div>
        <p className="text-[15px] font-bold leading-tight text-white">{label}</p>
        <p className="mt-0.5 text-[11px] font-medium text-white/60">{sub}</p>
      </div>

      {/* Arrow on hover */}
      <div
        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 9.5l7-7M4 2.5h5.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}

// ── LandCategories ─────────────────────────────────────────────────────────────

export function LandCategories() {
  return (
    <section
      className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8 sm:py-20"
      aria-labelledby="categories-heading"
    >
      {/* Header */}
      <div className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
            PHÂN LOẠI ĐẤT
          </p>
          <h2
            id="categories-heading"
            className="text-[28px] font-bold tracking-[-0.02em] text-[#1d1d1f] sm:text-[34px]"
          >
            7 loại đất nông nghiệp<br className="hidden sm:block" /> theo pháp lý Việt Nam
          </h2>
        </div>
        <Link
          href="/dat-nong-nghiep"
          className="mt-3 shrink-0 text-[14px] font-semibold text-[#1A4D2E] hover:underline sm:mt-0"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* 7-card grid: 2 col mobile, 3–4 tablet, 7 desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-7">
        {CATEGORIES.map((cat, i) => (
          <div
            key={cat.param}
            className={
              // On mobile, centre the 7th card in its own row (col 1 of 2)
              i === 6 ? 'col-span-2 sm:col-span-1 sm:col-auto max-w-[calc(50%-6px)] mx-auto w-full sm:max-w-none' : ''
            }
          >
            <CategoryCard {...cat} />
          </div>
        ))}
      </div>
    </section>
  )
}
