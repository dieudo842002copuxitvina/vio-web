'use client'

import { useState } from 'react'
import { buildUtmUrl, ZALO_SHARE_URL, FB_SHARE_URL } from '@/lib/utm'

interface Props {
  slug:         string
  title:        string
  provinceSlug: string
}

export function SharePanel({ slug, provinceSlug }: Props) {
  const [copied, setCopied] = useState(false)

  const base    = `https://violocal.vn/dat/${slug}`
  const content = `${provinceSlug}_${slug.slice(0, 20)}`

  const zaloUrl = ZALO_SHARE_URL(buildUtmUrl(base, 'zalo',     'listing_share', content))
  const fbUrl   = FB_SHARE_URL(buildUtmUrl(base,   'facebook', 'listing_share', content))
  const copyUrl = buildUtmUrl(base, 'direct', 'listing_share', content)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text is handled by browser
    }
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-[0.75rem] font-medium text-neutral-400 mr-1">Chia sẻ:</span>

      {/* Zalo */}
      <a
        href={zaloUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ qua Zalo"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0068FF] text-white
                   transition-opacity hover:opacity-80 active:scale-95"
      >
        <svg viewBox="0 0 32 32" fill="none" className="h-4 w-4" aria-hidden="true">
          <text x="4" y="22" fontSize="18" fontWeight="700" fill="white" fontFamily="sans-serif">Z</text>
        </svg>
      </a>

      {/* Facebook */}
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ qua Facebook"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white
                   transition-opacity hover:opacity-80 active:scale-95"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      {/* Copy link */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
        className="flex h-8 items-center gap-1.5 rounded-full border border-neutral-200 bg-white
                   px-3 text-[0.75rem] font-medium text-neutral-600 transition-all
                   hover:border-neutral-300 hover:bg-neutral-50 active:scale-95"
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-green-600" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-green-700">Đã sao chép</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            Sao chép link
          </>
        )}
      </button>
    </div>
  )
}
