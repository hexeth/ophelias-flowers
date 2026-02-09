/** Domain types for the commerce layer. */

export interface LineItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  items: LineItem[];
  updatedAt: string;
}

export type StockStatus = "available" | "low" | "sold-out";

export interface OrderSummary {
  items: LineItem[];
  subtotal: number;
  total: number;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface PreOrder {
  customer: CustomerDetails;
  items: LineItem[];
  subtotal: number;
  total: number;
  submittedAt: string;
}
