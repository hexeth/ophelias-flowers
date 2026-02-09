import type { LineItem } from "../commerce/types";

/** Vendor-agnostic payment provider interface. */
export interface PaymentProvider {
  /**
   * Create a checkout session with the payment provider.
   * Returns a URL to redirect the customer to the hosted checkout page.
   */
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /**
   * Verify a webhook signature from the payment provider.
   * Returns the parsed event payload if valid, or null if verification fails.
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Promise<WebhookEvent | null>;
}

export interface CheckoutSessionParams {
  lineItems: LineItem[];
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}
