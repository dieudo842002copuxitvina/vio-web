interface SellerCardProps {
  fullName:   string | null
  avatarUrl:  string | null
  phone:      string | null
  isVerified: boolean
  joinedYear?: number | null
}

export function SellerCard({
  fullName,
  avatarUrl,
  phone,
  isVerified,
  joinedYear,
}: SellerCardProps) {
  const displayName = fullName ?? 'Chủ đất'

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-gray-50 p-5 dark:bg-[#1C1C1E]">
      {/* Avatar */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl select-none"
            aria-hidden="true"
          >
            👤
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="m-0 truncate text-lg font-bold text-gray-900 dark:text-white">
            {displayName}
          </p>
          {isVerified && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-label="Đã xác thực"
              className="shrink-0 text-[#0071E3] dark:text-[#409CFF]"
            >
              <circle cx="9" cy="9" r="9" fill="currentColor" />
              <path
                d="M5.5 9l2.5 2.5 4.5-4.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <p className="m-0 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {isVerified ? 'Đã xác thực danh tính' : `Tham gia từ ${joinedYear ?? new Date().getFullYear()}`}
        </p>
      </div>

      {/* Quick action — Zalo */}
      {phone && (
        <a
          href={`https://zalo.me/${phone.replace(/^0/, '84')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Nhắn Zalo"
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#0068FF]/10 text-[#0068FF] no-underline transition-opacity hover:opacity-80 active:opacity-60 dark:bg-[#0068FF]/20"
        >
          {/* Zalo Z icon */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
            <text x="3" y="17" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">Z</text>
          </svg>
        </a>
      )}
    </div>
  )
}
