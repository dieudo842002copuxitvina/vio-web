// ── MockBillingProvider ───────────────────────────────────────────────────────
// No-op implementation: all operations succeed instantly with mock data.
// Used for development and demo — no real money movement.
//
// Swap this for a real provider when integrating a payment gateway:
//   import { StripeBillingProvider } from './stripe-provider'
//   export const billingProvider = new StripeBillingProvider(process.env.STRIPE_SECRET_KEY!)

import type {
  BillingProvider,
  CheckoutSession,
  PaymentVerification,
  CancellationResult,
} from './billing-provider'

class MockBillingProvider implements BillingProvider {
  readonly name = 'mock'

  async prepareCheckout(params: {
    profileId:  string
    planId:     string
    successUrl: string
    cancelUrl:  string
  }): Promise<CheckoutSession> {
    const sessionId = `mock_${params.planId}_${Date.now()}`
    return {
      sessionId,
      // In mock mode, "checkout" just redirects to successUrl immediately
      checkoutUrl: `${params.successUrl}?session=${sessionId}&provider=mock`,
      planId:      params.planId,
      profileId:   params.profileId,
      amountVnd:   params.planId === 'pro' ? 299_000 : 0,
      expiresAt:   new Date(Date.now() + 30 * 60 * 1_000).toISOString(),
    }
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    const parts = sessionId.split('_')
    return {
      verified:  sessionId.startsWith('mock_'),
      sessionId,
      planId:    parts[1] ?? 'pro',
      profileId: '',  // resolved from session store in a real implementation
    }
  }

  async cancelSubscription(_profileId: string): Promise<CancellationResult> {
    return {
      success:     true,
      effectiveAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    }
  }
}

// Singleton — replace to swap payment gateway
export const billingProvider: BillingProvider = new MockBillingProvider()
