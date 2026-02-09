import type {
  PaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookEvent,
} from "./types";

/**
 * Stripe adapter implementing the PaymentProvider interface.
 *
 * This is a stub — the actual Stripe SDK integration should be
 * implemented when the payment provider is configured.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 */
export class StripeAdapter implements PaymentProvider {
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor() {
    const secretKey = import.meta.env.STRIPE_SECRET_KEY;
    const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
      throw new Error(
        "Missing Stripe environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
      );
    }

    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(
    _params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    // TODO: Implement with Stripe SDK
    // - Map LineItem[] to Stripe line_items format
    // - Create Stripe checkout session
    // - Return session ID and checkout URL
    throw new Error("Stripe checkout session creation not yet implemented");
  }

  async verifyWebhookSignature(
    _payload: string,
    _signature: string,
  ): Promise<WebhookEvent | null> {
    // TODO: Implement with Stripe SDK
    // - Verify webhook signature using this.webhookSecret
    // - Parse and return event if valid
    // - Return null if verification fails
    void this.secretKey;
    void this.webhookSecret;
    throw new Error("Stripe webhook verification not yet implemented");
  }
}
