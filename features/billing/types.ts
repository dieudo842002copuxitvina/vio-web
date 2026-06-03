// ── Revenue Engine — shared types ─────────────────────────────────────────────

export type PlanId = 'free' | 'pro'

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trialing'

export type FeaturedListingStatus = 'active' | 'expired' | 'cancelled'

// ── DB row shapes ─────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id:             PlanId
  name:           string
  price_vnd:      number
  billing_period: 'forever' | 'monthly' | 'yearly'
  sort_order:     number
  is_active:      boolean
  created_at:     string
}

export interface Subscription {
  id:                   string
  profile_id:           string
  plan_id:              PlanId
  status:               SubscriptionStatus
  current_period_start: string
  current_period_end:   string | null
  cancelled_at:         string | null
  granted_by:           string | null
  metadata:             Record<string, unknown>
  created_at:           string
  updated_at:           string
}

export interface FeaturedListing {
  id:             string
  listing_id:     string
  merchant_id:    string
  starts_at:      string
  ends_at:        string | null
  priority_score: number
  status:         FeaturedListingStatus
  created_at:     string
}

// ── Application-layer feature flags ──────────────────────────────────────────

export interface PlanFeatures {
  maxListings:     number
  analyticsDays:   number
  hotLeads:        boolean
  smartMatching:   boolean
  featuredListing: boolean
}

export const FREE_PLAN_FEATURES: PlanFeatures = {
  maxListings:     10,
  analyticsDays:   7,
  hotLeads:        false,
  smartMatching:   false,
  featuredListing: false,
}

export const PRO_PLAN_FEATURES: PlanFeatures = {
  maxListings:     100,
  analyticsDays:   30,
  hotLeads:        true,
  smartMatching:   true,
  featuredListing: true,
}

// ── Featured listing card (returned by getActiveFeaturedListings) ─────────────

export interface FeaturedListingCard {
  id:            string
  slug:          string
  title:         string
  priceText:     string | null
  locationText:  string | null
  coverUrl:      string | null
  isFeatured:    boolean
  priorityScore: number
  endsAt:        string | null
}

// ── Plan display metadata ─────────────────────────────────────────────────────

export interface PlanDisplay {
  id:          PlanId
  name:        string
  priceVnd:    number
  period:      string
  description: string
  cta:         string
  features:    string[]
  highlighted: boolean
}

export const PLAN_DISPLAY: Record<PlanId, PlanDisplay> = {
  free: {
    id:          'free',
    name:        'Free',
    priceVnd:    0,
    period:      '',
    description: 'Dành cho người bắt đầu',
    cta:         'Dùng miễn phí',
    highlighted: false,
    features: [
      '10 tin đăng',
      'Phân tích 7 ngày',
      'CRM Leads cơ bản',
      'Tín hiệu hành vi (ấm, lạnh)',
    ],
  },
  pro: {
    id:          'pro',
    name:        'Pro',
    priceVnd:    299_000,
    period:      '/ tháng',
    description: 'Dành cho nhà môi giới chuyên nghiệp',
    cta:         'Nâng cấp Pro',
    highlighted: true,
    features: [
      '100 tin đăng',
      'Phân tích 30 ngày',
      'Lead nóng & rất nóng',
      'Smart Matching Engine',
      'Featured Listing (ưu tiên hiển thị)',
      'Merchant Insights đầy đủ',
    ],
  },
}
