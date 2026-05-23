'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error:  Error & { digest?: string }
  reset:  () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="page-wrap" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>⚠️</p>
      <h2 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: '0 0 0.75rem' }}>
        Đã xảy ra lỗi
      </h2>
      <p style={{ color: 'var(--sea-ink-soft)', margin: '0 0 2rem' }}>
        Không thể tải trang này. Vui lòng thử lại.
      </p>
      <button onClick={reset} className="btn-primary" style={{ minWidth: '160px' }}>
        Thử lại
      </button>
    </main>
  )
}
