import React from "react";
import {
  inventoryPrimaryButtonClassName,
  inventoryFilterFieldClassName,
  inventoryFilterLabelClassName,
  inventoryFilterLabelTextClassName,
} from "./inventory-table-controls";
import {
  VARIETY_CATEGORIES,
  categoryLabels,
  STOCK_STATUSES,
  stockLabels,
} from "../../lib/catalog/constants";
import type { InventoryTableFilters } from "../../lib/catalog/search";

interface InventoryTableFiltersProps {
  filters: InventoryTableFilters;
  isFiltering: boolean;
  isLoading: boolean;
  onAddVariety: () => void;
  onFilterChange: <K extends Exclude<keyof InventoryTableFilters, "query">>(
    key: K,
    value: InventoryTableFilters[K],
  ) => void;
  onSearchQueryChange: (value: string) => void;
  page: number;
  rangeEnd: number;
  rangeStart: number;
  searchQuery: string;
  totalCount: number;
}

export function InventoryTableFiltersPanel(props: InventoryTableFiltersProps) {
  const {
    filters,
    isFiltering,
    isLoading,
    onAddVariety,
    onFilterChange,
    onSearchQueryChange,
    page,
    rangeEnd,
    rangeStart,
    searchQuery,
    totalCount,
  } = props;

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">
            Catalog rows
          </p>
        </div>
        <button
          type="button"
          onClick={onAddVariety}
          className={inventoryPrimaryButtonClassName}
        >
          Add Variety
        </button>
      </div>

      <div className="grid gap-3 border border-ink bg-cream p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <label className={inventoryFilterLabelClassName}>
          <span className={inventoryFilterLabelTextClassName}>Filter</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search name, SKU, colors, description"
            className={inventoryFilterFieldClassName}
          />
        </label>

        <label className={inventoryFilterLabelClassName}>
          <span className={inventoryFilterLabelTextClassName}>Category</span>
          <select
            value={filters.category}
            onChange={(event) => onFilterChange("category", event.target.value)}
            className={inventoryFilterFieldClassName}
          >
            <option value="all">All Categories</option>
            {VARIETY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>

        <label className={inventoryFilterLabelClassName}>
          <span className={inventoryFilterLabelTextClassName}>Stock</span>
          <select
            value={filters.stock}
            onChange={(event) => onFilterChange("stock", event.target.value)}
            className={inventoryFilterFieldClassName}
          >
            <option value="all">All Stock</option>
            {STOCK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {stockLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className={inventoryFilterLabelClassName}>
          <span className={inventoryFilterLabelTextClassName}>Visibility</span>
          <select
            value={filters.visibility}
            onChange={(event) =>
              onFilterChange(
                "visibility",
                event.target.value as InventoryTableFilters["visibility"],
              )
            }
            className={inventoryFilterFieldClassName}
          >
            <option value="all">All Rows</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-xs uppercase tracking-widest text-stone-500"
      >
        {isFiltering || isLoading
          ? `Updating search over ${totalCount} varieties...`
          : totalCount === 0
            ? "No rows found."
            : `Showing ${rangeStart}-${rangeEnd} of ${totalCount} varieties on page ${page}.`}
      </p>
    </>
  );
}
