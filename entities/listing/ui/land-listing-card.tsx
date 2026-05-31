import { BaseListingCard } from './BaseListingCard'
import { ListingPrice }    from './ListingPrice'
import { ListingMeta }     from './ListingMeta'

// Public API is unchanged — existing callers continue to work.
// Internals now compose from BaseListingCard + atomic primitives.

export interface LandListingCardProps {
  slug:             string
  title:            string
  price_text?:      string | null
  land_area_text?:  string | null
  location?:        string | null
  land_type_label?: string | null
  legal_status?:    string | null
  image_url?:       string | null
  is_featured?:     boolean
  // New optional — omit to keep old behaviour
  layout?:          'grid' | 'list' | 'compact'
  showFavorite?:    boolean
}

export function LandListingCard({
  slug,
  title,
  price_text,
  land_area_text,
  location,
  land_type_label,
  legal_status,
  image_url,
  is_featured,
  layout       = 'grid',
  showFavorite = false,
}: LandListingCardProps) {
  const typeBadge = legal_status ?? land_type_label

  const metaItems = [
    land_area_text ? { text: land_area_text } : null,
    location       ? { text: location }       : null,
  ].filter(Boolean) as Array<{ text: string }>

  return (
    <BaseListingCard
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      imageUrl={image_url}
      imageAlt={title}
      placeholderEmoji="🌾"
      badges={[
        ...(typeBadge  ? [{ label: typeBadge,  variant: 'default' as const, position: 'left'  as const }] : []),
        ...(is_featured ? [{ label: 'Nổi bật', variant: 'primary' as const, position: 'right' as const }] : []),
      ]}
      listingId={slug}
      showFavorite={showFavorite}
      layout={layout}
    >
      <ListingPrice text={price_text} size="lg" />
      {metaItems.length > 0 && <ListingMeta items={metaItems} />}
      <p className="m-0 line-clamp-2 text-base font-medium leading-snug text-gray-800 dark:text-gray-200">
        {title}
      </p>
    </BaseListingCard>
  )
}
