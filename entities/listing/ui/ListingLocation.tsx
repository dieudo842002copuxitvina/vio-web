interface ListingLocationProps {
  text:       string | null | undefined
  className?: string
}

export function ListingLocation({ text, className = '' }: ListingLocationProps) {
  if (!text) return null

  return (
    <p
      className={[
        'flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 m-0',
        className,
      ].join(' ')}
    >
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 0a4 4 0 0 1 4 4c0 3-4 8-4 8S2 7 2 4a4 4 0 0 1 4-4zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
      </svg>
      <span className="min-w-0 truncate">{text}</span>
    </p>
  )
}
