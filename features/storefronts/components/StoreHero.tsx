import { Phone, MessageCircle, BadgeCheck } from 'lucide-react'
import type { Storefront } from '../storefront.types'

type Props = Pick<
  Storefront,
  'business_name' | 'avatar_url' | 'banner_url' | 'is_verified' | 'social_links' | 'contact_phone'
>

export function StoreHero({
  business_name,
  avatar_url,
  banner_url,
  is_verified,
  social_links,
  contact_phone,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl bg-[var(--surface)] shadow-apple-card">

      {/* Banner — gradient scrim adds depth at the bottom edge */}
      <div className="relative h-44 sm:h-56">
        {banner_url ? (
          <img
            src={banner_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--hero-a)] to-[var(--hero-b)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      {/* Identity area */}
      <div className="px-5 pb-6 sm:px-7">

        {/* Row: avatar (overlapping banner) + CTA buttons */}
        <div className="-mt-9 flex items-end justify-between gap-4 sm:-mt-11">

          {/* Avatar — rounded-2xl app-icon shape, shadow-ring instead of hard border */}
          <div
            className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-[var(--surface)]
                       shadow-[0_0_0_3px_var(--surface),0_8px_24px_rgb(0,0,0,0.18)] sm:h-[5.5rem] sm:w-[5.5rem]"
          >
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={business_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-3xl select-none"
                aria-hidden
              >
                🏪
              </span>
            )}
          </div>

          {/* Pill CTAs — stack on mobile, row on sm+ */}
          <div className="flex flex-col gap-2 pb-0.5 sm:flex-row">
            {contact_phone && (
              <a
                href={`tel:${contact_phone.replace(/\s/g, '')}`}
                className="inline-flex h-11 min-h-[44px] items-center justify-center gap-1.5
                           rounded-full bg-vio-primary px-5
                           text-[0.9375rem] font-semibold text-white no-underline
                           transition-opacity duration-150 hover:opacity-85 active:opacity-70"
              >
                <Phone size={15} aria-hidden />
                Gọi Ngay
              </a>
            )}
            {social_links.zalo && (
              <a
                href={`https://zalo.me/${social_links.zalo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 min-h-[44px] items-center justify-center gap-1.5
                           rounded-full bg-vio-blue/10 px-5 text-vio-blue
                           text-[0.9375rem] font-semibold no-underline
                           transition-opacity duration-150 hover:opacity-85 active:opacity-70"
              >
                <MessageCircle size={15} aria-hidden />
                Chat Zalo
              </a>
            )}
          </div>
        </div>

        {/* Business name + verified badge */}
        <div className="mt-4 flex items-center gap-2">
          <h1 className="m-0 text-[1.375rem] font-semibold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-2xl">
            {business_name}
          </h1>
          {is_verified && (
            <BadgeCheck
              size={20}
              className="shrink-0 text-vio-primary"
              aria-label="Đã xác thực"
            />
          )}
        </div>

      </div>
    </section>
  )
}
