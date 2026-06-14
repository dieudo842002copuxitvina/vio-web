// ── Components (Server Components — do NOT import in 'use client' files) ───────
export { SimilarListings }         from './components/SimilarListings'
export { TrendingListingsSection } from './components/TrendingListingsSection'
export { TrendingKeywords }        from './components/TrendingKeywords'
export { TrendingSearches }        from './components/TrendingSearches'
export { HomepageTrending }        from './components/HomepageTrending'
export { HomepageDiscovery }       from './components/HomepageDiscovery'

// ── Client components ──────────────────────────────────────────────────────────
export { TrackableCard }           from './components/TrackableCard'

// ── Types ──────────────────────────────────────────────────────────────────────
export type { TrendingScope, RecListingRow, RecommendedListing, MatchedListing } from './types'
export type { RecommendationType } from './api/tracking.server'

// ── API functions — import directly from the server modules, not via this barrel:
// import { getSimilarListings, getTrendingListings, getTrendingKeywords }
//   from '@/features/recommendation/api/recommendation.server'
// import { trackRecommendationClick }
//   from '@/features/recommendation/api/tracking.server'
// import { getSmartMatches }
//   from '@/features/recommendation/api/smart-match.server'
