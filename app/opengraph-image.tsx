import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'VIO AGRI — Nền tảng Giao dịch Đất Nông nghiệp Việt Nam'

export const size = {
  width:  1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     '#1A4D2E',
          width:          '100%',
          height:         '100%',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          fontFamily:     'system-ui, sans-serif',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Background texture — subtle radial glow */}
        <div
          style={{
            position:     'absolute',
            top:          -120,
            left:         -120,
            width:        500,
            height:       500,
            borderRadius: '50%',
            background:   'rgba(134,197,130,0.18)',
            filter:       'blur(80px)',
          }}
        />
        <div
          style={{
            position:     'absolute',
            bottom:       -80,
            right:        -80,
            width:        400,
            height:       400,
            borderRadius: '50%',
            background:   'rgba(134,197,130,0.12)',
            filter:       'blur(60px)',
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(255,255,255,0.10)',
            border:         '1.5px solid rgba(255,255,255,0.20)',
            borderRadius:   16,
            padding:        '10px 24px',
            marginBottom:   32,
          }}
        >
          <span
            style={{
              fontSize:   22,
              fontWeight: 800,
              color:      '#86C582',
              letterSpacing: '0.06em',
            }}
          >
            VIO AGRI
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize:      62,
            fontWeight:    900,
            color:         '#FFFFFF',
            textAlign:     'center',
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            maxWidth:      900,
            padding:       '0 40px',
          }}
        >
          Nền tảng Giao dịch
          <br />
          Đất Nông nghiệp Việt Nam
        </div>

        {/* Sub-line */}
        <div
          style={{
            marginTop:  28,
            fontSize:   26,
            color:      'rgba(255,255,255,0.70)',
            textAlign:  'center',
            fontWeight: 500,
          }}
        >
          Mua bán đất nông nghiệp uy tín · Xác minh pháp lý · Toàn quốc
        </div>

        {/* Bottom domain strip */}
        <div
          style={{
            position:       'absolute',
            bottom:         36,
            display:        'flex',
            alignItems:     'center',
            gap:            8,
          }}
        >
          <div
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   '#86C582',
            }}
          />
          <span
            style={{
              fontSize:   18,
              color:      'rgba(255,255,255,0.50)',
              fontWeight: 500,
            }}
          >
            vioagri.vn
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
