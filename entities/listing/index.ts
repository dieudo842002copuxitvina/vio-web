// ── UI components ─────────────────────────────────────────────────────────────
// Legacy base card (slot-based ReactNode meta)
export { ListingCard }     from './ui/listing-card'
export type { ListingCardProps } from './ui/listing-card'

// Base card shell (layout variants: grid | list | compact)
export { BaseListingCard } from './ui/BaseListingCard'
export type { BaseListingCardProps, CardBadgeDef, CardLayout } from './ui/BaseListingCard'

// Atomic sub-components
export { ListingBadgePill } from './ui/ListingBadge'
export { ListingPrice }    from './ui/ListingPrice'
export { ListingLocation } from './ui/ListingLocation'
export { ListingMeta }     from './ui/ListingMeta'
export type { MetaItem }   from './ui/ListingMeta'
export { FavoriteButton }  from './ui/FavoriteButton'

// Variant cards
export { LandListingCard }        from './ui/land-listing-card'
export { ProductListingCard }     from './ui/ProductListingCard'
export { ServiceListingCard }     from './ui/ServiceListingCard'
export { EventListingCard }       from './ui/EventListingCard'
export { RestaurantListingCard }  from './ui/RestaurantListingCard'
export type { LandListingCardProps }       from './ui/land-listing-card'
export type { ProductListingCardProps }    from './ui/ProductListingCard'
export type { ServiceListingCardProps }    from './ui/ServiceListingCard'
export type { EventListingCardProps }      from './ui/EventListingCard'
export type { RestaurantListingCardProps } from './ui/RestaurantListingCard'

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ListingType,
  ListingStatus,
  ModerationStatus,
  PriceType,
  BadgeVariant,
  ListingBadge,
  ListingMedia,
  ListingGeoRef,
  ListingOwner,
  UniversalListing,
  ListingCardData,
  ListingSitemapEntry,
  DynamicAttribute,
  AttributeValue,
  // Land-specific
  LandType,
  // DB row shapes (direct Supabase response — use adapters to convert)
  Listing,
  ListingMediaRow,
  ListingAttributeValueRow,
} from './model/types'

export { LISTING_TYPE_ROUTES, LISTING_TYPE_LABELS, LAND_TYPE_LABELS } from './model/types'

// ── Adapters ──────────────────────────────────────────────────────────────────
export {
  listingToLandCard,
  listingToUniversal,
  storefrontToUniversal,
  resolveLandTypeLabel,
} from './lib/adapters'
export type { LandCardOverrides } from './lib/adapters'

// ── Formatters ────────────────────────────────────────────────────────────────
export {
  formatPriceVND,
  parsePriceTy,
  formatArea,
  formatDate,
  formatRelativeTime,
  formatLocation,
  generateSlug,
  formatPhone,
} from './lib/formatters'

// ── Status helpers ────────────────────────────────────────────────────────────
export {
  isPubliclyVisible,
  getModerationLabel,
  getModerationColor,
  getStatusLabel,
  isEditable,
  canPublish,
} from './lib/status'

// ── Attribute schema types ────────────────────────────────────────────────────
export type {
  AttributeFieldType,
  AttributeSchemaOption,
  AttributeValidationRules,
  ListingAttributeSchema,
  ListingAttributeValue,
  AttributeRawValue,
  AttributeValueMap,
  AttributeValidationResult,
} from './model/attribute-schema'

// ── Attribute schema utilities (pure — safe to import anywhere) ───────────────
export type { NormalizedAttributeValue } from './lib/attribute-schema'
export {
  validateAttributeValues,
  normalizeAttributeValues,
  buildSearchableAttributes,
  schemaToFilterableMap,
} from './lib/attribute-schema'

// ── Server-side attribute schema queries — import directly, not via this barrel
// import { getAttributeSchema, getFilterableSchemas, getSearchableSchemas }
//   from '@/entities/listing/api/attribute-schema.server'
