import { categoryLabels } from "./constants";
import type {
  PaginatedSearchResult,
  PublicVarietySearchParams,
} from "./search";
import {
  clampPageSize,
  defaultPublicVarietySearchParams,
  parsePositiveInt,
} from "./search";
import type { Variety } from "./types";

export type PublicVarietyViewSize = "comfortable" | "compact";

interface FilterOption {
  count: number;
  label: string;
  value: string;
}

export interface PublicVarietyFilterData {
  categoryOptions: FilterOption[];
  colorOptions: FilterOption[];
  inStockCount: number;
}

export function parsePublicVarietySearchParams(searchParams: URLSearchParams): {
  searchParams: PublicVarietySearchParams;
  viewSize: PublicVarietyViewSize;
} {
  const sort = (() => {
    const value = searchParams.get("sort");

    if (
      value === "name-desc" ||
      value === "price-asc" ||
      value === "price-desc"
    ) {
      return value;
    }

    return defaultPublicVarietySearchParams.sort;
  })();

  return {
    searchParams: {
      categories: Array.from(
        new Set(searchParams.getAll("category").filter(Boolean)),
      ),
      colors: Array.from(new Set(searchParams.getAll("color").filter(Boolean))),
      inStockOnly: searchParams.get("stock") === "in",
      page: parsePositiveInt(
        searchParams.get("page"),
        defaultPublicVarietySearchParams.page,
      ),
      pageSize: clampPageSize(
        parsePositiveInt(
          searchParams.get("perPage"),
          defaultPublicVarietySearchParams.pageSize,
        ),
        12,
        48,
      ),
      query: (searchParams.get("q") ?? "").trim(),
      sort,
    },
    viewSize:
      searchParams.get("view") === "compact" ? "compact" : "comfortable",
  };
}

export function getPublicVarietyFilterData(
  varieties: Variety[],
): PublicVarietyFilterData {
  const categoryCounts = new Map<string, number>();
  const colorCounts = new Map<string, number>();
  let inStockCount = 0;

  for (const variety of varieties) {
    categoryCounts.set(
      variety.category,
      (categoryCounts.get(variety.category) ?? 0) + 1,
    );

    for (const color of variety.color) {
      colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    }

    if (variety.stock !== "sold-out") {
      inStockCount += 1;
    }
  }

  return {
    categoryOptions: [...categoryCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({
        value,
        label: categoryLabels[value as keyof typeof categoryLabels] ?? value,
        count,
      })),
    colorOptions: [...colorCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
        count,
      })),
    inStockCount,
  };
}

export function buildVarietiesPageUrl(
  params: PublicVarietySearchParams,
  viewSize: PublicVarietyViewSize,
  page: number,
) {
  const nextSearchParams = new URLSearchParams();

  if (params.query) {
    nextSearchParams.set("q", params.query);
  }

  for (const category of params.categories) {
    nextSearchParams.append("category", category);
  }

  for (const color of params.colors) {
    nextSearchParams.append("color", color);
  }

  if (params.inStockOnly) {
    nextSearchParams.set("stock", "in");
  }

  if (params.sort !== defaultPublicVarietySearchParams.sort) {
    nextSearchParams.set("sort", params.sort);
  }

  if (params.pageSize !== defaultPublicVarietySearchParams.pageSize) {
    nextSearchParams.set("perPage", String(params.pageSize));
  }

  if (viewSize !== "comfortable") {
    nextSearchParams.set("view", viewSize);
  }

  if (page > 1) {
    nextSearchParams.set("page", String(page));
  }

  const queryString = nextSearchParams.toString();
  return `/varieties${queryString ? `?${queryString}` : ""}`;
}

export function getSearchResultRange(result: PaginatedSearchResult<unknown>): {
  start: number;
  end: number;
} {
  if (result.total === 0) {
    return { start: 0, end: 0 };
  }

  return {
    start: (result.page - 1) * result.pageSize + 1,
    end: Math.min(result.page * result.pageSize, result.total),
  };
}
