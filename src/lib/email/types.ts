import type { PreOrder } from "../commerce/types";

/** Vendor-agnostic email provider interface. */
export interface EmailProvider {
  /**
   * Send a pre-order notification email to the shop owner.
   * Returns true if the email was sent successfully.
   */
  sendOrderNotification(order: PreOrder): Promise<boolean>;
}
