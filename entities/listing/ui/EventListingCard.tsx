import { BaseListingCard }  from './BaseListingCard'
import { ListingPrice }     from './ListingPrice'
import { ListingMeta }      from './ListingMeta'
import { ListingLocation }  from './ListingLocation'
import type { CardLayout }  from './BaseListingCard'

export interface EventListingCardProps {
  slug:           string
  title:          string
  image_url?:     string | null
  location?:      string | null
  event_date?:    string | null     // ISO: "2026-06-15"
  ticket_price?:  string | null     // pre-formatted: "200.000 đ"
  event_format?:  'in_person' | 'online' | 'hybrid' | null
  max_attendees?: number | null
  is_featured?:   boolean
  layout?:        CardLayout
  showFavorite?:  boolean
}

const FORMAT_LABEL: Record<string, string> = {
  in_person: 'Trực tiếp',
  online:    'Trực tuyến',
  hybrid:    'Kết hợp',
}

function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function isUpcoming(iso: string | null | undefined): boolean {
  if (!iso) return false
  return new Date(iso) >= new Date()
}

export function EventListingCard({
  slug,
  title,
  image_url,
  location,
  event_date,
  ticket_price,
  event_format,
  max_attendees,
  is_featured,
  layout       = 'grid',
  showFavorite = false,
}: EventListingCardProps) {
  const upcoming = isUpcoming(event_date)
  const dateStr  = formatEventDate(event_date)

  const metaItems = [
    dateStr       ? { icon: '📅', text: dateStr }                         : null,
    event_format  ? { icon: '📍', text: FORMAT_LABEL[event_format] ?? event_format } : null,
    max_attendees ? { icon: '👥', text: `${max_attendees} người` }        : null,
  ].filter(Boolean) as Array<{ icon: string; text: string }>

  return (
    <BaseListingCard
      href={`/su-kien/${slug}`}
      imageUrl={image_url}
      imageAlt={title}
      placeholderEmoji="🎪"
      badges={[
        ...(upcoming && event_date
          ? [{ label: 'Sắp diễn ra', variant: 'success' as const, position: 'left' as const }]
          : event_date
          ? [{ label: 'Đã kết thúc', variant: 'default' as const, position: 'left' as const }]
          : []),
        ...(is_featured ? [{ label: 'Nổi bật', variant: 'primary' as const, position: 'right' as const }] : []),
      ]}
      listingId={slug}
      showFavorite={showFavorite}
      layout={layout}
    >
      <p className="m-0 line-clamp-2 text-base font-medium leading-snug text-gray-800 dark:text-gray-200">
        {title}
      </p>
      <ListingLocation text={location} />
      {metaItems.length > 0 && <ListingMeta items={metaItems} />}
      {ticket_price
        ? <ListingPrice text={ticket_price} size="sm" />
        : <p className="m-0 text-sm font-medium text-[#34C759]">Miễn phí</p>
      }
    </BaseListingCard>
  )
}
