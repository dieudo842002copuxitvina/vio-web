// ── BillingProvider — payment gateway abstraction ─────────────────────────────
//
// This interface is the single contract any payment processor must satisfy.
// Current implementation: MockBillingProvider (no-op, no real money movement).
//
// To add a real payment gateway (Stripe, MoMo, ZaloPay, VNPay, etc.):
//   1. Create a class that implements BillingProvider in this directory
//   2. Replace the singleton export in mock-provider.ts (or add env-based selection)
//   3. Add a webhook handler at /api/webhooks/[provider]/route.ts
//   4. Call verifyPayment() in the webhook to activate the subscription

export interface CheckoutSession {
  sessionId:    string
  checkoutUrl:  string  // redirect the user here to complete payment
  planId:       string
  profileId:    string
  amountVnd:    number
  expiresAt:    string  // ISO timestamp — session expiry
}

export interface PaymentVerification {
  verified:  boolean
  sessionId: string
  planId:    string
  profileId: string
}

export interface CancellationResult {
  success:     boolean
  effectiveAt: string  // ISO — when cancellation takes effect (end of billing period)
}

export interface BillingProvider {
  readonly name: string

  /**
   * Initiates a checkout session for upgrading to the given plan.
   * Returns a URL the user should be redirected to complete payment.
   */
  prepareCheckout(params: {
    profileId:   string
    planId:      string
    successUrl:  string   // absolute URL — redirect on success
    cancelUrl:   string   // absolute URL — redirect on cancel
  }): Promise<CheckoutSession>

  /**
   * Verifies a completed payment.
   * Called from the success route or webhook handler.
   * On success, caller should call grantPro() to activate the subscription.
   */
  verifyPayment(sessionId: string): Promise<PaymentVerification>

  /**
   * Cancels the active subscription at end of current billing period.
   * The subscription remains active until effectiveAt.
   */
  cancelSubscription(profileId: string): Promise<CancellationResult>
}
