import type { VARIETY_CATEGORIES, STOCK_STATUSES } from "./constants";

export type VarietyCategory = (typeof VARIETY_CATEGORIES)[number];
export type StockStatus = (typeof STOCK_STATUSES)[number];

export interface Variety {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: StockStatus;
  category: VarietyCategory;
  color: string[];
  bloomSize: string;
  height: string;
  imageUrl: string;
  imageKey: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VarietyRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  price_cents: number;
  sale_price_cents: number | null;
  stock: StockStatus;
  category: VarietyCategory;
  color_json: string;
  bloom_size: string;
  height: string;
  image_url: string | null;
  image_key: string | null;
  hidden: number;
  created_at: string;
  updated_at: string;
}
