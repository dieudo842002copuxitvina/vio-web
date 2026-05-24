import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// ── Font ──────────────────────────────────────────────────────────────────────
// next/font handles self-hosting; the CSS variable is consumed by @theme in
// globals.css → --font-sans: var(--font-inter), ...SF Pro fallbacks.

const inter = Inter({
  subsets:  ['latin', 'vietnamese'],
  variable: '--font-inter',
  display:  'swap',
})

// ── Static metadata ───────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://violocal.vn'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ── Title ─────────────────────────────────────────────────────────────
  // Pages set `title` (string) and Next.js interpolates the template.
  // Pages that omit `title` fall back to the default string.
  title: {
    default:  'VIO LOCAL — Nền tảng Kinh tế Địa phương Việt Nam',
    template: '%s | VIO LOCAL',
  },

  // ── Description ───────────────────────────────────────────────────────
  description:
    'Khám phá đất nông nghiệp, hộ kinh doanh và nông sản địa phương trên toàn 63 tỉnh thành Việt Nam. Kết nối người mua và người bán bất động sản nông nghiệp uy tín.',

  // ── Open Graph ────────────────────────────────────────────────────────
  openGraph: {
    siteName: 'VIO LOCAL',
    locale:   'vi_VN',
    type:     'website',
    images: [
      {
        url:    '/og-image.jpg',   // place a 1200×630 image at public/og-image.jpg
        width:  1200,
        height: 630,
        alt:    'VIO LOCAL — Nền tảng Kinh tế Địa phương Việt Nam',
      },
    ],
  },

  // ── Twitter / X card ──────────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    site:        '@violocal',
    title:       'VIO LOCAL — Nền tảng Kinh tế Địa phương Việt Nam',
    description: 'Đất nông nghiệp, hộ kinh doanh và nông sản địa phương trên 63 tỉnh thành.',
    images:      ['/og-image.jpg'],
  },

  // ── Canonical / alternates ────────────────────────────────────────────
  alternates: {
    canonical: '/',
    languages: { 'vi-VN': '/' },
  },

  // ── Verification (add keys when available) ────────────────────────────
  // verification: { google: 'xxx', yandex: 'xxx' },
}

// ── Viewport — exported separately (Next.js 14+) ──────────────────────────────
// maximum-scale=1 + user-scalable=no prevents iOS Safari from zooming in on
// <input> focus, which would require the user to manually zoom back out.
// This is intentional and aligned with native app feel (Apple HIG).

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Extend into the notch / Dynamic Island area on iPhone
  viewportFit:  'cover',
}

// ── Root Layout ───────────────────────────────────────────────────────────────
// Provides only the HTML shell.
// All page chrome (TopNav, BottomTabBar, Sidebar) lives in sub-layouts:
//   app/(public)/layout.tsx   — public SEO pages
//   app/(dashboard)/layout.tsx — authenticated seller/admin pages

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-vio-surface text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
