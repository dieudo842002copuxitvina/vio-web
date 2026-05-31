import { BaseListingCard }  from './BaseListingCard'
import { ListingPrice }     from './ListingPrice'
import { ListingMeta }      from './ListingMeta'
import { ListingLocation }  from './ListingLocation'
import type { CardLayout }  from './BaseListingCard'

export interface RestaurantListingCardProps {
  slug:                string
  title:               string
  image_url?:          string | null
  location?:           string | null
  price_text?:         string | null       // "50.000 – 200.000 đ / người"
  cuisine_type?:       string | null       // "Việt Nam · Hải sản"
  opening_hours?:      string | null       // "07:00 – 22:00"
  is_open_now?:        boolean | null      // null = unknown
  reservation_enabled?: boolean
  is_featured?:        boolean
  layout?:             CardLayout
  showFavorite?:       boolean
}

export function RestaurantListingCard({
  slug,
  title,
  image_url,
  location,
  price_text,
  cuisine_type,
  opening_hours,
  is_open_now,
  reservation_enabled,
  is_featured,
  layout       = 'grid',
  showFavorite = false,
}: RestaurantListingCardProps) {
  // Open / closed status badge
  const statusBadge =
    is_open_now === true  ? { label: 'Đang mở',  variant: 'success' as const, position: 'left' as const } :
    is_open_now === false ? { label: 'Đã đóng',  variant: 'default' as const, position: 'left' as const } :
    null

  const metaItems = [
    cuisine_type    ? { icon: '🍽️', text: cuisine_type }    : null,
    opening_hours   ? { icon: '🕐', text: opening_hours }   : null,
    reservation_enabled ? { icon: '📅', text: 'Đặt bàn trước' } : null,
  ].filter(Boolean) as Array<{ icon: string; text: string }>

  return (
    <BaseListingCard
      href={`/nha-hang/${slug}`}
      imageUrl={image_url}
      imageAlt={title}
      placeholderEmoji="🍜"
      badges={[
        ...(statusBadge ? [statusBadge] : []),
        ...(is_featured  ? [{ label: 'Nổi bật', variant: 'primary' as const, position: 'right' as const }] : []),
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
      {price_text && <ListingPrice text={price_text} size="sm" />}
    </BaseListingCard>
  )
}
