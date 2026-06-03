// ── Revenue Engine V1 — public barrel ─────────────────────────────────────────

// Types
export type {
  PlanId,
  SubscriptionStatus,
  FeaturedListingStatus,
  SubscriptionPlan,
  Subscription,
  FeaturedListing,
  FeaturedListingCard,
  PlanFeatures,
  PlanDisplay,
} from './types'

export {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PLAN_DISPLAY,
} from './types'

// Provider interface (for DI / testing)
export type {
  CheckoutSession,
  PaymentVerification,
  CancellationResult,
  BillingProvider,
} from './providers/billing-provider'

// API server functions — import directly, not via this barrel:
// import { getSubscriptionFeatures, getActiveSubscription, getListingCount, getBillingMetrics }
//   from '@/features/billing/api/subscription.server'
// import { getActiveFeaturedListings }
//   from '@/features/billing/api/featured-listing.server'
// import { grantPro, revokePro, activateFeaturedListing, deactivateFeaturedListing }
//   from '@/features/billing/api/admin.server'
// import { billingProvider }
//   from '@/features/billing/providers/mock-provider'
