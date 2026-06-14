// ── Ranking boost weights ─────────────────────────────────────────────────────
// These mirror the values used inside the search_listings_hybrid() PostgreSQL
// function. The Postgres function is the source of truth for actual ranking;
// these constants are used on the JS side for documentation and validation.

export const RANK_WEIGHTS = {
  /** ts_rank multiplied by 2.0 inside search_listings_hybrid() */
  FTS_BASE:        2.00,
  /** Title trigram similarity × 0.8 (desc similarity × 0.2 is separate) */
  TRIGRAM_BONUS:   0.80,
  /** Boost for is_featured = true listings */
  FEATURED:        0.30,
  /** Boost for is_verified = true listings/storefronts */
  VERIFIED:        0.10,
  /** Boost when listing.province_id matches the active province filter */
  PROVINCE_MATCH:  0.20,
  /** Boost when listing.district_id matches the active district filter */
  DISTRICT_MATCH:  0.15,
  /** Boost when listing.category_id matches the active category filter */
  CATEGORY_MATCH:  0.10,
  /** Max recency bonus (linear decay over 30 days) */
  RECENCY_MAX:     0.05,
} as const

export type RankWeightKey = keyof typeof RANK_WEIGHTS
