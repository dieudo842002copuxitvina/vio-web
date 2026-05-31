// Server Component — universal contact card used on ALL detail pages.
// Renders call / Zalo / email actions from UniversalListing contact fields.

interface ListingContactCardProps {
  contact_phone: string | null
  contact_zalo:  string | null
  contact_email: string | null
  title?:        string
}

export function ListingContactCard({
  contact_phone,
  contact_zalo,
  contact_email,
  title = 'Liên hệ',
}: ListingContactCardProps) {
  const hasAny = contact_phone || contact_zalo || contact_email
  if (!hasAny) return null

  return (
    <div className={[
      'rounded-3xl border border-gray-100/60 bg-white p-5',
      'shadow-[0_2px_16px_rgb(0,0,0,0.06)]',
      'dark:border-white/[0.06] dark:bg-[#1C1C1E]',
    ].join(' ')}>
      <h3 className="mb-4 text-[0.875rem] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </h3>

      <div className="flex flex-col gap-3">
        {contact_phone && (
          <a
            href={`tel:${contact_phone}`}
            className={[
              'flex h-11 items-center justify-center gap-2',
              'rounded-2xl bg-[#34C759] text-white',
              'text-[0.9375rem] font-semibold no-underline',
              'transition-opacity hover:opacity-90 active:opacity-75',
            ].join(' ')}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.27 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.72-.72a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.28 17z" />
            </svg>
            Gọi ngay
          </a>
        )}

        {contact_zalo && (
          <a
            href={contact_zalo.startsWith('http') ? contact_zalo : `https://zalo.me/${contact_zalo}`}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              'flex h-11 items-center justify-center gap-2',
              'rounded-2xl bg-[#0068FF] text-white',
              'text-[0.9375rem] font-semibold no-underline',
              'transition-opacity hover:opacity-90 active:opacity-75',
            ].join(' ')}
          >
            <span className="text-base font-black leading-none select-none" aria-hidden="true">Z</span>
            Zalo
          </a>
        )}

        {contact_email && (
          <a
            href={`mailto:${contact_email}`}
            className={[
              'flex h-11 items-center justify-center gap-2',
              'rounded-2xl border border-gray-200 dark:border-white/[0.12]',
              'text-gray-700 dark:text-gray-300',
              'text-[0.9375rem] font-semibold no-underline',
              'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]',
            ].join(' ')}
          >
            <svg width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="1" y="1" width="22" height="16" rx="2" />
              <path d="M1 1l11 9 11-9" />
            </svg>
            Email
          </a>
        )}
      </div>
    </div>
  )
}
