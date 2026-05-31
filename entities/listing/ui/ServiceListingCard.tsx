import { BaseListingCard }  from './BaseListingCard'
import { ListingPrice }     from './ListingPrice'
import { ListingMeta }      from './ListingMeta'
import { ListingLocation }  from './ListingLocation'
import type { CardLayout }  from './BaseListingCard'
import type { PriceType }   from '../model/types'

export interface ServiceListingCardProps {
  slug:              string
  title:             string
  image_url?:        string | null
  location?:         string | null
  price_text?:       string | null
  price_type?:       PriceType | null
  years_experience?: number | null
  onsite_support?:   boolean
  category_label?:   string | null
  is_verified?:      boolean
  is_featured?:      boolean
  layout?:           CardLayout
  showFavorite?:     boolean
}

export function ServiceListingCard({
  slug,
  title,
  image_url,
  location,
  price_text,
  price_type,
  years_experience,
  onsite_support,
  category_label,
  is_verified,
  is_featured,
  layout       = 'grid',
  showFavorite = false,
}: ServiceListingCardProps) {
  const metaItems = [
    years_experience != null ? { icon: '⭐', text: `${years_experience} năm KN` } : null,
    onsite_support           ? { icon: '🚗', text: 'Đến tận nơi' }                : null,
    category_label           ? { icon: '🔧', text: category_label }                : null,
  ].filter(Boolean) as Array<{ icon: string; text: string }>

  return (
    <BaseListingCard
      href={`/dich-vu/${slug}`}
      imageUrl={image_url}
      imageAlt={title}
      placeholderEmoji="🔧"
      badges={[
        ...(is_verified ? [{ label: 'Đã xác minh', variant: 'success' as const, position: 'left'  as const }] : []),
        ...(is_featured  ? [{ label: 'Nổi bật',     variant: 'primary' as const, position: 'right' as const }] : []),
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
      {price_text && <ListingPrice text={price_text} priceType={price_type} size="md" />}
    </BaseListingCard>
  )
}
