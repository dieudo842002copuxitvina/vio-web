import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
}

export default function NotFound() {
  return (
    <main className="page-wrap" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <p style={{ fontSize: '4rem', margin: '0 0 1rem' }}>🌾</p>
      <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: '0 0 0.75rem' }}>
        Trang không tồn tại
      </h1>
      <p style={{ color: 'var(--sea-ink-soft)', fontSize: '1rem', margin: '0 0 2rem', lineHeight: 1.6 }}>
        Trang bạn tìm kiếm đã bị xóa hoặc địa chỉ URL không đúng.
      </p>
      <a href="/" className="btn-primary" style={{ minWidth: '160px' }}>
        Về trang chủ
      </a>
    </main>
  )
}
