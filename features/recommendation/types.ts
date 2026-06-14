// ── Recommendation Engine — shared types ──────────────────────────────────────

import type { LandListingCardProps } from '@/entities/listing'

export type TrendingScope = 'national' | 'province' | 'category'

// Minimal DB row shape selected from `listings` by recommendation queries.
// Keeps bandwidth low — only the fields required to render a LandListingCard.
export interface RecListingRow {
  id:            string
  slug:          string
  title:         string
  cover_url:     string | null
  location_text: string | null
  price_text:    string | null
  is_featured:   boolean
}

// LandListingCardProps + the listing UUID needed for click tracking.
// Returned by all recommendation server functions.
export type RecommendedListing = LandListingCardProps & { id: string }

// ── Smart Matching Engine output ──────────────────────────────────────────────
// One match record returned by getSmartMatches().

export interface MatchedListing {
  // Identity
  recommendedListingId: string
  confidenceScore:      number   // [0.00, 1.00]
  reason:               string   // human-readable Vietnamese explanation

  // Match dimension flags
  categoryMatch:  boolean   // listing.category_id === intent.favoriteCategory
  provinceMatch:  boolean   // listing.province_id === intent.favoriteProvince
  behaviorMatch:  boolean   // similar to a listing the buyer already engaged with

  // Card display props (avoid a second fetch on the consumer side)
  slug:         string
  title:        string
  priceText:    string | null
  locationText: string | null
  coverUrl:     string | null
  isFeatured:   boolean
}
