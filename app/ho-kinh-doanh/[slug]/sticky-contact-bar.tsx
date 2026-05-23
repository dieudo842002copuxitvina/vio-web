'use client'

interface Props {
  phone:   string | null
  zaloUrl: string | null
}

export default function StickyContactBar({ phone, zaloUrl }: Props) {
  return (
    <div
      className="sticky-contact-bar fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none px-5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto flex gap-2 p-1.5 rounded-full backdrop-blur-2xl bg-white/80 dark:bg-black/80 shadow-[0_8px_32px_rgb(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgb(0,0,0,0.4)] border border-black/[0.06] dark:border-white/[0.1]">

        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full bg-[#0071E3] hover:bg-[#005BBB] active:opacity-75 text-white font-semibold text-[15px] no-underline transition-colors"
          >
            {/* Phone icon */}
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13 10.3c-.6.6-1.2.8-1.8.7-1.5-.4-3-1.3-4.2-2.5C5.8 7.3 4.9 5.8 4.5 4.3c-.2-.6.1-1.2.7-1.8L6 1.7c.3-.3.8-.3 1 0l1.8 1.8c.3.3.3.7 0 1L7.6 5.7a.4.4 0 0 0-.1.4 7.7 7.7 0 0 0 3.5 3.5.4.4 0 0 0 .4-.1l1.2-1.2c.3-.3.7-.3 1 0l1.8 1.8c.3.3.3.7 0 1L13 10.3z" />
            </svg>
            Gọi Ngay
          </a>
        )}

        {zaloUrl && (
          <a
            href={zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.12] hover:bg-black/[0.1] dark:hover:bg-white/[0.18] active:opacity-75 text-[var(--sea-ink)] font-semibold text-[15px] no-underline transition-colors"
          >
            {/* Zalo bubble icon */}
            <svg width="16" height="15" viewBox="0 0 16 15" fill="currentColor" aria-hidden="true">
              <path d="M8 0C4.134 0 1 2.797 1 6.25c0 1.963.988 3.72 2.546 4.896l-.42 2.22 2.508-.784A7.45 7.45 0 0 0 8 12.75c3.866 0 7-2.797 7-6.25S11.866 0 8 0Z"/>
            </svg>
            Zalo
          </a>
        )}

      </div>
    </div>
  )
}
