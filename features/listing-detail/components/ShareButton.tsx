'use client'

import { useState } from 'react'

interface ShareButtonProps {
  title: string
  text?: string
  url:   string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator === 'undefined') return

    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url })
      } catch {
        // User cancelled — not an error
      }
      return
    }

    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Chia sẻ"
      title={copied ? 'Đã sao chép!' : 'Chia sẻ'}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-full',
        'border border-gray-200 dark:border-white/[0.12]',
        'bg-white dark:bg-[#1C1C1E]',
        'text-gray-500 dark:text-gray-400',
        'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.06]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/50',
      ].join(' ')}
    >
      {copied ? (
        <svg className="h-4 w-4 text-[#34C759]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="3" r="1.5" />
          <circle cx="4"  cy="8" r="1.5" />
          <circle cx="12" cy="13" r="1.5" />
          <path d="M5.4 9l5.2 3M10.6 4L5.4 7" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
