'use client'

import { trackRecommendationClick } from '../api/tracking.server'
import type { RecommendationType }   from '../api/tracking.server'

interface TrackableCardProps {
  targetId:  string
  sourceId?: string | null
  type:      RecommendationType
  children:  React.ReactNode
}

// Thin client wrapper that fires a recommendation click event on interaction.
// Uses `className="contents"` so layout is fully owned by the child card.
export function TrackableCard({
  targetId,
  sourceId,
  type,
  children,
}: TrackableCardProps) {
  function handleClick() {
    void trackRecommendationClick({
      target_listing_id:   targetId,
      source_listing_id:   sourceId ?? null,
      recommendation_type: type,
    })
  }

  return (
    <div onClick={handleClick} className="contents">
      {children}
    </div>
  )
}
