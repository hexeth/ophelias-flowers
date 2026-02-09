import type { EmailProvider } from "./types";
import type { PreOrder } from "../commerce/types";
import { formatPrice } from "../commerce/pricing";

/**
 * Resend adapter implementing the EmailProvider interface.
 *
 * Uses the Resend REST API directly (no SDK dependency).
 * Required environment variables:
 *   RESEND_API_KEY  — API key from resend.com
 *   ORDER_EMAIL_TO  — Recipient email (shop owner)
 *   ORDER_EMAIL_FROM — Sender email (must be verified in Resend)
 */
export class ResendAdapter implements EmailProvider {
  private readonly apiKey: string;
  private readonly to: string;
  private readonly from: string;

  constructor(apiKey: string, to: string, from: string) {
    this.apiKey = apiKey;
    this.to = to;
    this.from = from;
  }

  async sendOrderNotification(order: PreOrder): Promise<boolean> {
    const subject = `New Pre-Order from ${order.customer.name}`;
    const html = this.buildEmailHtml(order);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: this.to,
        subject,
        html,
      }),
    });

    return response.ok;
  }

  private buildEmailHtml(order: PreOrder): string {
    const itemRows = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${item.sku}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
          </tr>`,
      )
      .join("");

    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 4px;">New Pre-Order</h1>
        <p style="color: #666; margin-top: 0;">Submitted ${new Date(order.submittedAt).toLocaleString()}</p>

        <h2 style="font-size: 18px; margin-top: 32px;">Customer Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; font-weight: bold;">Name</td><td>${order.customer.name}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: bold;">Email</td><td><a href="mailto:${order.customer.email}">${order.customer.email}</a></td></tr>
          <tr><td style="padding: 4px 0; font-weight: bold;">Phone</td><td>${order.customer.phone}</td></tr>
          ${order.customer.notes ? `<tr><td style="padding: 4px 0; font-weight: bold;">Notes</td><td>${order.customer.notes}</td></tr>` : ""}
        </table>

        <h2 style="font-size: 18px; margin-top: 32px;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th style="padding: 8px; text-align: left;">Variety</th>
              <th style="padding: 8px; text-align: left;">SKU</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">${formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }
}
