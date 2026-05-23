import type { Metadata } from 'next'
import { createClient }  from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Đất nông nghiệp toàn quốc',
  description: 'Mua bán và cho thuê đất nông nghiệp trên toàn 63 tỉnh thành Việt Nam. Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.',
  alternates: { canonical: '/dat-nong-nghiep' },
}

interface ProvRow { id: number; name: string; slug: string }

async function getProvinces(): Promise<ProvRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .order('name', { ascending: true })
  return (data ?? []) as ProvRow[]
}

export default async function LandIndexPage() {
  const provinces = await getProvinces()

  return (
    <main className="page-wrap" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        <a href="/" style={{ color: 'var(--muted)' }}>Trang chủ</a>
        {' / '}
        <span style={{ color: 'var(--sea-ink)' }}>Đất nông nghiệp</span>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <p className="island-kicker" style={{ marginBottom: '0.5rem' }}>Thị trường đất đai</p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: 0 }}>
          Đất nông nghiệp toàn quốc
        </h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', color: 'var(--sea-ink-soft)', lineHeight: 1.6 }}>
          Chọn tỉnh thành để xem danh sách đất nông nghiệp tại khu vực đó.
        </p>
      </header>

      {provinces.length > 0 && (
        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.625rem',
          listStyle: 'none', margin: 0, padding: 0,
        }}>
          {provinces.map(p => (
            <li key={p.id}>
              <a
                href={`/dat-nong-nghiep/${p.slug}`}
                style={{
                  display: 'block',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--chip-line)',
                  background: 'var(--chip-bg)',
                  color: 'var(--sea-ink)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                  transition: 'border-color 150ms',
                }}
              >
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
