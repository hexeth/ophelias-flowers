import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { createEmailProvider } from "../lib/email/index";
import { formatPrice } from "../lib/commerce/pricing";
import type { PreOrder } from "../lib/commerce/types";

export const server = {
  submitPreOrder: defineAction({
    accept: "form",
    input: z.object({
      customerName: z.string().min(1, "Name is required"),
      customerEmail: z.string().email("Valid email is required"),
      customerPhone: z.string().min(7, "Phone number is required"),
      customerNotes: z.string().optional(),
      items: z.string().transform((val, ctx) => {
        try {
          const parsed = JSON.parse(val);
          const itemSchema = z.array(
            z.object({
              sku: z.string(),
              name: z.string(),
              price: z.number().positive(),
              quantity: z.number().int().positive(),
            }),
          );
          return itemSchema.parse(parsed);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid cart data",
          });
          return z.NEVER;
        }
      }),
    }),
    handler: async (input) => {
      if (input.items.length === 0) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Cart is empty",
        });
      }

      const subtotal = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const order: PreOrder = {
        customer: {
          name: input.customerName,
          email: input.customerEmail,
          phone: input.customerPhone,
          notes: input.customerNotes,
        },
        items: input.items,
        subtotal,
        total: subtotal,
        submittedAt: new Date().toISOString(),
      };

      const emailProvider = createEmailProvider({
        RESEND_API_KEY: import.meta.env.RESEND_API_KEY,
        ORDER_EMAIL_TO: import.meta.env.ORDER_EMAIL_TO,
        ORDER_EMAIL_FROM: import.meta.env.ORDER_EMAIL_FROM,
      });

      if (emailProvider) {
        const sent = await emailProvider.sendOrderNotification(order);
        if (!sent) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send order notification. Please try again.",
          });
        }
      } else {
        // Development fallback: log the order
        console.log("=== PRE-ORDER RECEIVED ===");
        console.log(`Customer: ${order.customer.name} (${order.customer.email})`);
        console.log(`Phone: ${order.customer.phone}`);
        console.log(`Items: ${order.items.length}`);
        console.log(`Total: ${formatPrice(order.total)}`);
        if (order.customer.notes) {
          console.log(`Notes: ${order.customer.notes}`);
        }
        console.log("==========================");
      }

      return {
        success: true,
        customerName: order.customer.name,
        total: formatPrice(order.total),
        itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      };
    },
  }),
};
