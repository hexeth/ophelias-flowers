import type { EmailProvider } from "./types";
import { ResendAdapter } from "./resend-adapter";

/**
 * Create the configured email provider.
 * Returns null if required environment variables are not set,
 * allowing the application to run in development without email.
 */
export function createEmailProvider(env: {
  RESEND_API_KEY?: string;
  ORDER_EMAIL_TO?: string;
  ORDER_EMAIL_FROM?: string;
}): EmailProvider | null {
  const { RESEND_API_KEY, ORDER_EMAIL_TO, ORDER_EMAIL_FROM } = env;

  if (!RESEND_API_KEY || !ORDER_EMAIL_TO || !ORDER_EMAIL_FROM) {
    return null;
  }

  return new ResendAdapter(RESEND_API_KEY, ORDER_EMAIL_TO, ORDER_EMAIL_FROM);
}
