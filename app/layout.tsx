import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import './globals.css'

const inter = Inter({
  subsets:  ['latin', 'vietnamese'],
  variable: '--font-inter',
  display:  'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://violocal.vn'),
  title: {
    default:  'VIO LOCAL — Chợ nông sản & hộ kinh doanh địa phương',
    template: '%s | VIO LOCAL',
  },
  description: 'Khám phá hộ kinh doanh, nông sản và đất nông nghiệp địa phương trên toàn quốc.',
  openGraph: {
    siteName: 'VIO LOCAL',
    locale:   'vi_VN',
    type:     'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
