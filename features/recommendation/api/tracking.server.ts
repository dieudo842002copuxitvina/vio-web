'use server'

import { trackListingClick } from '@/features/signals/api/tracking.server'

export type RecommendationType = 'similar' | 'trending' | 'discovery' | 'seo'

interface RecommendationClickPayload {
  source_listing_id:   string | null
  target_listing_id:   string
  recommendation_type: RecommendationType
}

// Fire-and-forget server action — safe to call without await.
// Writes to listing_events via the shared trackListingClick helper,
// storing recommendation context in the metadata JSONB column.
export async function trackRecommendationClick(
  payload: RecommendationClickPayload,
): Promise<void> {
  return trackListingClick(payload.target_listing_id, {
    source: payload.recommendation_type,
    metadata: {
      source_listing_id:   payload.source_listing_id,
      recommendation_type: payload.recommendation_type,
    },
  })
}
