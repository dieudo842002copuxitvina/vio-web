import { LandCard } from './LandCard'

// ── LandListingCardProps ───────────────────────────────────────────────────────
// Legacy props shape — kept so all callers (province page, recommendation engine,
// etc.) compile without changes. Internally delegated to the Apple HIG LandCard.

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
  is_verified?:     boolean
  layout?:          'grid' | 'list' | 'compact'
  showFavorite?:    boolean
}

const VARIANT_MAP = {
  grid:    'standard',
  list:    'list',
  compact: 'compact',
} as const

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
  is_verified,
  layout       = 'grid',
  showFavorite = false,
}: LandListingCardProps) {
  return (
    <LandCard
      id={slug}
      slug={slug}
      title={title}
      imageUrl={image_url}
      price={price_text}
      area={land_area_text}
      locationText={location}
      landType={land_type_label}
      legalStatus={legal_status}
      isFeatured={is_featured}
      isVerified={is_verified}
      variant={VARIANT_MAP[layout]}
      showFavorite={showFavorite}
    />
  )
}
