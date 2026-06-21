import type { ReactNode } from 'react'

// ── StaticPageLayout ──────────────────────────────────────────────────────────
// Wrapper cho các trang thông tin tĩnh (Về chúng tôi, Quy trình, Pháp lý…).
// Render một header banner có nền xanh lá, sau đó bọc children trong
// @tailwindcss/typography (prose prose-lg) để tự động làm đẹp nội dung.

interface StaticPageLayoutProps {
  /** Tiêu đề hiển thị trong header banner */
  title: string
  /** Mô tả ngắn hiển thị bên dưới tiêu đề */
  description?: string
  /** Label nhỏ phía trên tiêu đề (VD: "Về chúng tôi", "Hỗ trợ") */
  eyebrow?: string
  children: ReactNode
}

export function StaticPageLayout({
  title,
  description,
  eyebrow,
  children,
}: StaticPageLayoutProps) {
  return (
    <>
      {/* ── Header banner ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-vio-forest py-20 sm:py-28"
        aria-hidden={false}
      >
        {/* Subtle radial glow for depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 120%, #34C759 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-8">
          {eyebrow && (
            <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-vio-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[2.75rem]">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-4 max-w-[560px] text-[1.0625rem] leading-relaxed text-white/65">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ── Prose content area ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 sm:py-20">
        <div
          className="
            prose prose-lg mx-auto max-w-none
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
            prose-h2:mt-12 prose-h2:text-[1.625rem] prose-h2:first:mt-0
            prose-h3:mt-8 prose-h3:text-[1.25rem]
            prose-p:text-gray-600 prose-p:leading-[1.75]
            prose-li:text-gray-600 prose-li:leading-[1.75]
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-a:text-vio-forest prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-vio-forest prose-blockquote:text-gray-600
            prose-hr:border-gray-100
          "
        >
          {children}
        </div>
      </div>
    </>
  )
}
