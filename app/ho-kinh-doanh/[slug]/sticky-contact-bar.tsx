'use client'

interface Props {
  phone:   string | null
  zaloUrl: string | null
}

export default function StickyContactBar({ phone, zaloUrl }: Props) {
  return (
    <div
      className="sticky-contact-bar"
      style={{
        position:    'fixed',
        bottom:      0,
        left:        0,
        right:       0,
        zIndex:      100,
        display:     'flex',
        gap:         '0.75rem',
        padding:     '0.75rem 1rem',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        background:  'var(--header-bg)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop:   '1px solid var(--line)',
        boxShadow:   '0 -4px 24px rgba(23,58,64,0.10)',
      }}
    >
      {phone && (
        <a
          href={`tel:${phone}`}
          style={{
            flex:            1,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '0.5rem',
            minHeight:       '48px',
            borderRadius:    '0.75rem',
            border:          '1px solid transparent',
            background:      'var(--lagoon)',
            color:           '#fff',
            fontWeight:      700,
            fontSize:        '0.9375rem',
            textDecoration:  'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          📞 Gọi Ngay
        </a>
      )}

      {zaloUrl && (
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex:            1,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '0.5rem',
            minHeight:       '48px',
            borderRadius:    '0.75rem',
            border:          '1px solid var(--chip-line)',
            background:      'var(--chip-bg)',
            color:           'var(--sea-ink)',
            fontWeight:      700,
            fontSize:        '0.9375rem',
            textDecoration:  'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          💬 Zalo
        </a>
      )}
    </div>
  )
}
