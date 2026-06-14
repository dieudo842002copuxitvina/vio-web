// Saved search domain types.
// SavedSearchFilters is the canonical shape for the JSONB `filters` column.
// Must stay JSON-serializable (no Date, no Set, no undefined).

import type { SavedSearchFilters } from '@/entities/listing/model/normalized-types'

export type { SavedSearchFilters }

export type NotificationFrequency = 'instant' | 'daily' | 'weekly'

export interface SavedSearch {
  id:                      string
  user_id:                 string
  label:                   string
  query_url:               string
  filters:                 SavedSearchFilters
  notification_enabled:    boolean
  notification_frequency:  NotificationFrequency
  last_notified_at:        string | null   // ISO datetime
  match_count:             number
  created_at:              string
}

export interface SavedSearchMatch {
  id:              string
  saved_search_id: string
  listing_id:      string
  matched_at:      string
  sent_at:         string | null
  channel:         'push' | 'email' | 'zalo' | null
}

// ── Filter display helpers ─────────────────────────────────────────────────────
// Used by SavedSearchList to render human-readable filter chips.

export function describeSavedSearch(filters: SavedSearchFilters): string[] {
  const chips: string[] = []

  if (filters.land_type) {
    const labels: Record<string, string> = {
      lua: 'Đất lúa', rau_mau: 'Rau màu', cay_lau_nam: 'Cây lâu năm',
      an_trai: 'Cây ăn trái', lam_nghiep: 'Lâm nghiệp',
      mat_nuoc: 'Mặt nước', hon_hop: 'Hỗn hợp',
    }
    chips.push(labels[filters.land_type] ?? filters.land_type)
  }

  if (filters.price_min != null || filters.price_max != null) {
    const fmt = (n: number) =>
      n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(1)}Tỷ`
      : n >= 1_000_000   ? `${Math.round(n / 1_000_000)}Triệu`
      : n.toLocaleString('vi-VN')
    if (filters.price_min != null && filters.price_max != null)
      chips.push(`${fmt(filters.price_min)}–${fmt(filters.price_max)}`)
    else if (filters.price_min != null)
      chips.push(`Từ ${fmt(filters.price_min)}`)
    else if (filters.price_max != null)
      chips.push(`Đến ${fmt(filters.price_max!)}`)
  }

  if (filters.area_min != null || filters.area_max != null) {
    const fmt = (n: number) => n >= 10_000 ? `${(n / 10_000).toFixed(1)}ha` : `${n.toLocaleString('vi-VN')}m²`
    if (filters.area_min != null && filters.area_max != null)
      chips.push(`${fmt(filters.area_min)}–${fmt(filters.area_max)}`)
    else if (filters.area_min != null)
      chips.push(`Từ ${fmt(filters.area_min)}`)
    else if (filters.area_max != null)
      chips.push(`Đến ${fmt(filters.area_max!)}`)
  }

  if (filters.has_road_access)  chips.push('Có đường xe hơi')
  if (filters.has_electricity)  chips.push('Có điện')
  if (filters.has_gps)          chips.push('Có GPS')

  if (filters.flood_risk_max) {
    const labels: Record<string, string> = { none: 'Không ngập', low: 'Ngập thấp', medium: 'Ngập TB' }
    chips.push(labels[filters.flood_risk_max] ?? filters.flood_risk_max)
  }

  if (filters.soil_type?.length)
    chips.push(`Đất: ${filters.soil_type.length} loại`)

  if (filters.certifications?.length)
    chips.push(filters.certifications.join(', ').toUpperCase())

  if (filters.tier_min) {
    const tiers: Record<string, string> = { silver: 'Tin ≥ Silver', gold: 'Tin ≥ Gold', platinum: 'Tin Platinum' }
    chips.push(tiers[filters.tier_min] ?? '')
  }

  return chips.filter(Boolean)
}
