const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Format a numeric price as a USD currency string.
 * @example formatPrice(8.5) => "$8.50"
 */
export function formatPrice(amount: number): string {
  return USD_FORMATTER.format(amount);
}
