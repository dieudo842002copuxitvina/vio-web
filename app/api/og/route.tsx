import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const W = 1200
const H = 630

// ── Colour tokens ─────────────────────────────────────────────────────────────
const GREEN_900 = '#14532d'
const GREEN_700 = '#15803d'
const GREEN_200 = '#bbf7d0'
const GREEN_100 = '#dcfce7'
const WHITE      = '#ffffff'
const GRAY_900   = '#111827'
const GRAY_500   = '#6b7280'
const GRAY_100   = '#f3f4f6'
const AMBER_400  = '#fbbf24'

// ── Sub-layouts ───────────────────────────────────────────────────────────────

function LeftPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '38%',
        height: '100%',
        background: `linear-gradient(160deg, ${GREEN_900} 0%, ${GREEN_700} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 40px',
      }}
    >
      {children}
    </div>
  )
}

function RightPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '62%',
        height: '100%',
        backgroundColor: WHITE,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
      }}
    >
      {children}
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: GREEN_200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 20, height: 20, backgroundColor: GREEN_900, borderRadius: 4 }} />
      </div>
      <span style={{ color: WHITE, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
        VIO AGRI
      </span>
    </div>
  )
}

function Domain() {
  return (
    <span style={{ color: GREEN_200, fontSize: 14, letterSpacing: '0.05em' }}>
      violocal.vn
    </span>
  )
}

// ── Image generators ──────────────────────────────────────────────────────────

function ListingCard({ title, price, province }: { title: string; price: string; province: string }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <LeftPanel>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              backgroundColor: GREEN_200,
              color: GREEN_900,
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 100,
              width: 'fit-content',
              letterSpacing: '0.08em',
            }}
          >
            TIN ĐĂNG
          </span>
          {province && (
            <span style={{ color: GREEN_100, fontSize: 16, marginTop: 4 }}>
              📍 {province}
            </span>
          )}
        </div>
        <Domain />
      </LeftPanel>

      <RightPanel>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: GRAY_500, fontSize: 13, letterSpacing: '0.06em', marginBottom: 12 }}>
            ĐẤT NÔNG NGHIỆP · BÁN
          </span>
          <span
            style={{
              color: GRAY_900,
              fontSize: title.length > 60 ? 30 : 36,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            {title.length > 80 ? title.slice(0, 77) + '…' : title}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {price && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                backgroundColor: GRAY_100,
                borderRadius: 16, padding: '14px 20px',
              }}
            >
              <span style={{ fontSize: 28, color: AMBER_400 }}>₫</span>
              <span style={{ color: GRAY_900, fontSize: 28, fontWeight: 700 }}>{price}</span>
            </div>
          )}
          <span style={{ color: GRAY_500, fontSize: 14 }}>
            Xem chi tiết trên VIO AGRI
          </span>
        </div>
      </RightPanel>
    </div>
  )
}

function ProvinceCard({ name, count, region }: { name: string; count: string; region: string }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <LeftPanel>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {region && (
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: GREEN_100,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 100,
                letterSpacing: '0.06em',
                width: 'fit-content',
              }}
            >
              {region.toUpperCase()}
            </span>
          )}
          <span style={{ color: WHITE, fontSize: 15, marginTop: 4, lineHeight: 1.4 }}>
            Bản đồ đất nông nghiệp theo tỉnh thành
          </span>
        </div>
        <Domain />
      </LeftPanel>

      <RightPanel>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: GRAY_500, fontSize: 13, letterSpacing: '0.06em', marginBottom: 12 }}>
            ĐẤT NÔNG NGHIỆP · {name?.toUpperCase()}
          </span>
          <span
            style={{
              color: GRAY_900,
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {count && Number(count) > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: GREEN_700, fontSize: 48, fontWeight: 800 }}>{count}</span>
              <span style={{ color: GRAY_500, fontSize: 20 }}>tin đăng đang hoạt động</span>
            </div>
          )}
          <span style={{ color: GRAY_500, fontSize: 14 }}>
            violocal.vn · Kết nối chủ đất — không qua môi giới
          </span>
        </div>
      </RightPanel>
    </div>
  )
}

function DefaultCard() {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <LeftPanel>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: GREEN_100, fontSize: 15, lineHeight: 1.5 }}>
            Sàn giao dịch đất nông nghiệp hàng đầu Việt Nam
          </span>
        </div>
        <Domain />
      </LeftPanel>

      <RightPanel>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: GRAY_500, fontSize: 13, letterSpacing: '0.06em', marginBottom: 16 }}>
            NỀN TẢNG NÔNG NGHIỆP
          </span>
          <span
            style={{
              color: GRAY_900, fontSize: 48, fontWeight: 800,
              letterSpacing: '-1px', lineHeight: 1.15,
            }}
          >
            Mua bán đất{'\n'}nông nghiệp uy tín
          </span>
          <span style={{ color: GRAY_500, fontSize: 18, marginTop: 20 }}>
            Kết nối trực tiếp chủ đất — không qua môi giới.
          </span>
        </div>
        <span style={{ color: GRAY_500, fontSize: 14 }}>
          violocal.vn
        </span>
      </RightPanel>
    </div>
  )
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') ?? 'default'

  let element: React.ReactElement

  if (type === 'listing') {
    element = (
      <ListingCard
        title={searchParams.get('title') ?? 'Đất nông nghiệp cần bán'}
        price={searchParams.get('price') ?? ''}
        province={searchParams.get('province') ?? ''}
      />
    )
  } else if (type === 'province') {
    element = (
      <ProvinceCard
        name={searchParams.get('name') ?? 'Tỉnh'}
        count={searchParams.get('count') ?? '0'}
        region={searchParams.get('region') ?? ''}
      />
    )
  } else {
    element = <DefaultCard />
  }

  return new ImageResponse(element, {
    width:  W,
    height: H,
  })
}
