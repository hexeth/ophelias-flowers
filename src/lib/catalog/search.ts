import type { Variety } from "./types";

export type PublicVarietySort =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc";

export interface PublicVarietySearchParams {
  categories: string[];
  colors: string[];
  inStockOnly: boolean;
  page: number;
  pageSize: number;
  query: string;
  sort: PublicVarietySort;
}

export type InventorySortField =
  | "name"
  | "category"
  | "stock"
  | "price"
  | "salePrice"
  | "color"
  | "bloomSize"
  | "height"
  | "hidden"
  | "updatedAt";

export interface InventoryTableFilters {
  category: string;
  stock: string;
  visibility: "all" | "visible" | "hidden";
  query: string;
}

export interface InventoryTableSort {
  direction: "asc" | "desc";
  field: InventorySortField;
}

export interface AdminVarietySearchParams {
  filters: InventoryTableFilters;
  page: number;
  pageSize: number;
  sort: InventoryTableSort;
}

export interface PaginatedSearchResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VarietySearchSuggestion {
  category: string;
  imageUrl: string;
  name: string;
  slug: string;
  sku: string;
  stock: string;
}

export const defaultPublicVarietySearchParams: PublicVarietySearchParams = {
  categories: [],
  colors: [],
  inStockOnly: false,
  page: 1,
  pageSize: 24,
  query: "",
  sort: "name-asc",
};

export const defaultInventoryTableFilters: InventoryTableFilters = {
  category: "all",
  stock: "all",
  visibility: "all",
  query: "",
};

export const defaultAdminVarietySearchParams: AdminVarietySearchParams = {
  filters: defaultInventoryTableFilters,
  page: 1,
  pageSize: 25,
  sort: {
    direction: "asc",
    field: "name",
  },
};

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function getSearchTerms(query: string) {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

export function parsePositiveInt(
  value: string | null | undefined,
  fallback: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function clampPageSize(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildPaginatedSearchResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedSearchResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function mergeSearchResultRows(
  pinnedRows: Variety[],
  result: PaginatedSearchResult<Variety>,
) {
  const pinnedIds = new Set(pinnedRows.map((row) => row.id));

  return [
    ...pinnedRows,
    ...result.items.filter((row) => !pinnedIds.has(row.id)),
  ];
}
