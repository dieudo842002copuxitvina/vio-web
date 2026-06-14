// ── Personalization module — shared types & UI constants ──────────────────────

// ── Buyer Intent ──────────────────────────────────────────────────────────────

export type IntentLevel = 'high' | 'medium' | 'low'

export const INTENT_ORDER: Record<IntentLevel, number> = {
  high:   3,
  medium: 2,
  low:    1,
}

export const INTENT_LABEL: Record<IntentLevel, string> = {
  high:   'Cao',
  medium: 'Trung bình',
  low:    'Thấp',
}

export const INTENT_EMOJI: Record<IntentLevel, string> = {
  high:   '🔥',
  medium: '👀',
  low:    '💤',
}

export const INTENT_COLOR: Record<IntentLevel, string> = {
  high:   'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400',
  medium: 'bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-400',
  low:    'bg-gray-100  text-gray-500   dark:bg-gray-800      dark:text-gray-400',
}

export interface BuyerIntent {
  profileId:        string
  intentLevel:      IntentLevel
  favoriteCategory: number | null  // category_id from listings table
  favoriteProvince: number | null  // province_id from listings table
  lastDetectedAt:   string
}

// ── Diagnostic breakdown returned by internal scoring (not stored) ────────────

export interface BuyerIntentSignals {
  uniqueListingsViewed:  number
  maxViewsSameListing:   number
  maxListingsSameCategory: number
  maxListingsSameProvince: number
  totalSaves:            number
  phoneReveals:          number
}
