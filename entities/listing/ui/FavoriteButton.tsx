'use client'

import { useState } from 'react'

interface FavoriteButtonProps {
  listingId:   string
  initialState?: boolean
  // onToggle fires for persistence — caller wires to Server Action or API route
  onToggle?:   (id: string, next: boolean) => void
  className?:  string
}

export function FavoriteButton({
  listingId,
  initialState = false,
  onToggle,
  className = '',
}: FavoriteButtonProps) {
  const [active, setActive] = useState(initialState)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()   // don't follow the parent card link
    e.stopPropagation()
    const next = !active
    setActive(next)
    onToggle?.(listingId, next)
  }

  return (
    <button
      type="button"
      aria-label={active ? 'Bỏ yêu thích' : 'Yêu thích'}
      aria-pressed={active}
      onClick={handleClick}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-full',
        'backdrop-blur-md transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        active
          ? 'bg-[#FF3B30]/80 text-white'
          : 'bg-black/25 text-white hover:bg-black/40',
        className,
      ].join(' ')}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
      >
        <path
          d="M8 13.7S1.5 9.5 1.5 5.3A3.8 3.8 0 0 1 8 2.8a3.8 3.8 0 0 1 6.5 2.5C14.5 9.5 8 13.7 8 13.7z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
