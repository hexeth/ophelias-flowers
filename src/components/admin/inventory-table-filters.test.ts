import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryTableFiltersPanel } from "./inventory-table-filters";
import { inventoryFilterFieldClassName } from "./inventory-table-controls";
import type { InventoryTableFilters } from "../../lib/catalog/search";

const defaultFilters: InventoryTableFilters = {
  category: "all",
  stock: "all",
  visibility: "all",
  query: "",
};

function renderFilters(
  overrides: Partial<Parameters<typeof InventoryTableFiltersPanel>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(InventoryTableFiltersPanel, {
      filters: defaultFilters,
      isFiltering: false,
      isLoading: false,
      onAddVariety: vi.fn(),
      onFilterChange: vi.fn(),
      onSearchQueryChange: vi.fn(),
      page: 1,
      rangeEnd: 10,
      rangeStart: 1,
      searchQuery: "",
      totalCount: 10,
      ...overrides,
    }),
  );
}

describe("InventoryTableFiltersPanel", () => {
  it("renders the Add Variety button", () => {
    const html = renderFilters();
    expect(html).toContain("Add Variety");
  });

  it("renders a search input with the filter label", () => {
    const html = renderFilters();
    expect(html).toContain("Filter");
    expect(html).toContain('type="search"');
  });

  it("renders category, stock, and visibility dropdowns", () => {
    const html = renderFilters();
    expect(html).toContain("All Categories");
    expect(html).toContain("All Stock");
    expect(html).toContain("All Rows");
  });

  it("applies the shared field class to all filter controls", () => {
    const html = renderFilters();
    const classOccurrences =
      html.split(inventoryFilterFieldClassName).length - 1;
    expect(classOccurrences).toBe(4);
  });

  it("shows the page summary when not loading", () => {
    const html = renderFilters({
      rangeStart: 1,
      rangeEnd: 10,
      totalCount: 25,
      page: 1,
    });
    expect(html).toContain("Showing 1-10 of 25 varieties on page 1.");
  });

  it("shows loading text while fetching", () => {
    const html = renderFilters({ isLoading: true, totalCount: 50 });
    expect(html).toContain("Updating search over 50 varieties...");
  });

  it("shows loading text while filtering", () => {
    const html = renderFilters({ isFiltering: true, totalCount: 30 });
    expect(html).toContain("Updating search over 30 varieties...");
  });

  it("shows a no-results message when totalCount is zero", () => {
    const html = renderFilters({
      totalCount: 0,
      rangeStart: 0,
      rangeEnd: 0,
    });
    expect(html).toContain("No rows found.");
  });

  it("renders category options from the constants", () => {
    const html = renderFilters();
    expect(html).toContain("Dinnerplate");
    expect(html).toContain("Cactus");
    expect(html).toContain("Pompon");
  });

  it("renders stock status options", () => {
    const html = renderFilters();
    expect(html).toContain("In Stock");
    expect(html).toContain("Low Stock");
    expect(html).toContain("Sold Out");
  });

  it("renders visibility options", () => {
    const html = renderFilters();
    expect(html).toContain("Visible");
    expect(html).toContain("Hidden");
  });
});
