// ── Lead Intelligence Layer — types & UI constants ────────────────────────────

export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'very_hot'

// Numeric order used for sorting (higher = higher priority)
export const TEMP_ORDER: Record<LeadTemperature, number> = {
  very_hot: 4,
  hot:      3,
  warm:     2,
  cold:     1,
}

export const TEMP_LABEL: Record<LeadTemperature, string> = {
  very_hot: 'Rất nóng',
  hot:      'Nóng',
  warm:     'Ấm',
  cold:     'Lạnh',
}

export const TEMP_EMOJI: Record<LeadTemperature, string> = {
  very_hot: '🔥🔥',
  hot:      '🔥',
  warm:     '☀️',
  cold:     '❄️',
}

export const TEMP_COLOR: Record<LeadTemperature, string> = {
  very_hot: 'bg-red-50    text-red-600    dark:bg-red-900/20    dark:text-red-400',
  hot:      'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  warm:     'bg-blue-50   text-blue-600   dark:bg-blue-900/20   dark:text-blue-400',
  cold:     'bg-gray-100  text-gray-500   dark:bg-gray-800      dark:text-gray-400',
}

export const TEMP_DOT_COLOR: Record<LeadTemperature, string> = {
  very_hot: 'bg-red-500',
  hot:      'bg-orange-400',
  warm:     'bg-blue-400',
  cold:     'bg-gray-300',
}

// ── Scoring constants (mirrors the scoring engine) ────────────────────────────

// event_type strings as they appear in listing_events
// phone_click in spec → phone_reveal in DB
// contact      in spec → inquiry      in DB
export const EVENT_WEIGHT: Record<string, number> = {
  impression:   1,
  click:        3,
  save:         10,
  share:        15,
  phone_reveal: 25,
  inquiry:      40,
}

export const EVENT_ICON: Record<string, string> = {
  impression:   '👁',
  click:        '🖱️',
  save:         '🔖',
  share:        '📤',
  phone_reveal: '📞',
  inquiry:      '💬',
}

export const EVENT_LABEL: Record<string, string> = {
  impression:   'Đã xem tin',
  click:        'Đã nhấp vào tin',
  save:         'Đã lưu tin',
  share:        'Đã chia sẻ tin',
  phone_reveal: 'Đã xem số điện thoại',
  inquiry:      'Đã liên hệ người bán',
}

// ── Output shapes ─────────────────────────────────────────────────────────────

export interface BehavioralLead {
  profileId:      string
  listingId:      string
  score:          number
  temperature:    LeadTemperature
  lastActivityAt: string
  profileName:    string | null
  profileAvatar:  string | null
  profilePhone:   string | null
  listingTitle:   string | null
  listingSlug:    string | null
}

export interface LeadTimelineEvent {
  id:           number
  eventType:    string
  createdAt:    string
  listingId:    string
  listingTitle: string | null
  listingSlug:  string | null
}
