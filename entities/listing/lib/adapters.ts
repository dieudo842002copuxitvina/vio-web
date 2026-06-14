// ── DB row → UI prop adapters ──────────────────────────────────────────────────
// All adapters now target the universal 'listings' table.

import type { Listing, UniversalListing, ListingBadge, LandType } from '../model/types'
import { LISTING_TYPE_ROUTES, LAND_TYPE_LABELS }                   from '../model/types'
import { formatLocation }                                           from './formatters'
import type { LandCardProps }                                       from '../ui/LandCard'

// ── Listing → LandCardProps ───────────────────────────────────────────────────
// Maps a universal Listing row to the props shape that LandCard expects.
// Pass optional resolved attribute values when available.

export interface LandCardOverrides {
  land_area_text?: string | null
  land_type_label?: string | null
  legal_status?: string | null
  proLocked?: boolean
}

// toLandCard — maps a Listing row to the new LandCard component props.
// Includes `id` field. Use this with the new <LandCard> component.
export function toLandCard(l: Listing, overrides: LandCardOverrides = {}): LandCardProps {
  return {
    id:           l.id,
    slug:         l.slug,
    title:        l.title,
    imageUrl:     l.cover_url,
    locationText: l.location_text,
    price:        l.price_text,
    priceType:    l.price_type,
    area:         overrides.land_area_text ?? null,
    landType:     overrides.land_type_label ?? null,
    legalStatus:  overrides.legal_status ?? null,
    isFeatured:   l.is_featured,
    isVerified:   l.is_verified,
    proLocked:    overrides.proLocked ?? false,
  }
}

// listingToLandCard — legacy adapter for LandListingCard (old shape, no `id`).
// Existing callers do: { id: l.id, ...listingToLandCard(l) } — keep that pattern.
export function listingToLandCard(l: Listing, overrides: LandCardOverrides = {}) {
  return {
    slug:             l.slug,
    title:            l.title,
    price_text:       l.price_text,
    land_area_text:   overrides.land_area_text ?? null,
    location:         l.location_text,
    land_type_label:  overrides.land_type_label ?? null,
    legal_status:     overrides.legal_status ?? null,
    image_url:        l.cover_url,
    is_featured:      l.is_featured,
  }
}

// ── Listing → UniversalListing ────────────────────────────────────────────────
// Use this when the consumer needs the full UniversalListing shape (search, feed).
// For card rendering prefer listingToLandCard() which is cheaper.

export function listingToUniversal(l: Listing): UniversalListing {
  const badges: ListingBadge[] = []
  if (l.is_featured) badges.push({ label: 'Nổi bật',    variant: 'primary'  })
  if (l.is_verified) badges.push({ label: 'Đã xác thực', variant: 'success' })

  return {
    id:    l.id,
    type:  l.type,
    slug:  l.slug,
    href:  `${LISTING_TYPE_ROUTES[l.type]}/${l.slug}`,

    title:             l.title,
    short_description: l.short_description,
    description:       l.description,

    cover_url: l.cover_url,
    media:     [],

    province_id:   l.province_id,
    district_id:   l.district_id,
    location_text: l.location_text,

    price_text:  l.price_text,
    price_type:  l.price_type,

    is_featured:       l.is_featured,
    is_verified:       l.is_verified,
    is_public:         l.is_public,
    moderation_status: l.moderation_status,

    category_id: l.category_id,

    owner_id:      l.owner_id,
    storefront_id: l.storefront_id,
    owner:         null,

    contact_phone: l.contact_phone,
    contact_zalo:  l.contact_zalo,
    contact_email: l.contact_email,

    badges,
    attributes: {},

    published_at: l.published_at,
    created_at:   l.created_at,
    updated_at:   l.updated_at,
  }
}

// ── Storefront adapter (for search results + discovery) ───────────────────────

interface StorefrontRow {
  id:            string
  slug:          string
  business_name: string
  description:   string | null
  avatar_url:    string | null
  is_verified:   boolean
  province_id:   number | null
  district_id:   number | null
}

export function storefrontToUniversal(
  s: StorefrontRow,
  locationText?: string | null,
): UniversalListing {
  const badges: ListingBadge[] = []
  if (s.is_verified) badges.push({ label: 'Đã xác thực', variant: 'success' })

  return {
    id:    s.id,
    type:  'service',
    slug:  s.slug,
    href:  `/doanh-nghiep/${s.slug}`,

    title:             s.business_name,
    short_description: s.description,
    description:       s.description,

    cover_url: s.avatar_url,
    media:     [],

    province_id:   s.province_id,
    district_id:   s.district_id,
    location_text: locationText ?? null,

    price_text:  null,
    price_type:  null,

    is_featured:       false,
    is_verified:       s.is_verified,
    is_public:         true,
    moderation_status: 'approved',

    category_id: null,

    owner_id:      null,
    storefront_id: s.id,
    owner:         null,

    contact_phone: null,
    contact_zalo:  null,
    contact_email: null,

    badges,
    attributes: {},

    published_at: null,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }
}

// ── Land type label resolver ───────────────────────────────────────────────────
// Resolves the display label for a land type stored in listing_attribute_values.
// The attr value contains the raw enum string (e.g. 'lua', 'an_trai').

export function resolveLandTypeLabel(attrValue: string | null | undefined): string | null {
  if (!attrValue) return null
  return LAND_TYPE_LABELS[attrValue as LandType] ?? attrValue
}

// Re-export for compatibility: formatLocation is used by some pages directly.
export { formatLocation }
