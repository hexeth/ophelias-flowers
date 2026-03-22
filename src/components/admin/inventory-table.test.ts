import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InventoryTable from "./inventory-table";
import { inventoryFilterFieldClassName } from "./inventory-table-controls";
import type { Variety } from "../../lib/varieties";

const sampleVariety: Variety = {
  id: "1",
  slug: "cafe-au-lait",
  name: "Cafe au Lait",
  sku: "DAH-CAL-001",
  description: "Cream blush dinnerplate blooms.",
  price: 12,
  salePrice: null,
  stock: "available",
  category: "decorative",
  color: ["cream", "blush"],
  bloomSize: "8-10 inches",
  height: "4 feet",
  imageUrl: "/images/cafe.jpg",
  imageKey: null,
  hidden: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-11T00:00:00.000Z",
};

const secondVariety: Variety = {
  id: "2",
  slug: "thomas-edison",
  name: "Thomas Edison",
  sku: "DAH-TED-002",
  description: "Deep purple decorative dahlia.",
  price: 10,
  salePrice: 8,
  stock: "low",
  category: "decorative",
  color: ["purple"],
  bloomSize: "6-8 inches",
  height: "3-4 feet",
  imageUrl: "/images/thomas-edison.jpg",
  imageKey: null,
  hidden: false,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-12T00:00:00.000Z",
};

function renderTable(
  overrides: Partial<Parameters<typeof InventoryTable>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(InventoryTable, {
      initialPage: 1,
      initialPageSize: 25,
      initialTotalCount: 1,
      initialVarieties: [sampleVariety],
      ...overrides,
    }),
  );
}

describe("InventoryTable filter controls", () => {
  it("uses the shared field class for the filter input and all dropdowns", () => {
    const html = renderTable();
    const classOccurrences =
      html.split(inventoryFilterFieldClassName).length - 1;

    expect(classOccurrences).toBe(4);
    expect(html).toContain("Filter");
  });

  it("renders a native delete confirmation dialog", () => {
    const html = renderTable();

    expect(html).toContain("<dialog");
    expect(html).toContain("Confirm deletion");
    expect(html).toContain("Delete variety");
  });
});

describe("InventoryTable structure", () => {
  it("renders a table with thead and tbody", () => {
    const html = renderTable();
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
  });

  it("renders sortable column headers", () => {
    const html = renderTable();
    expect(html).toContain(">Name<");
    expect(html).toContain(">Category<");
    expect(html).toContain(">Stock<");
    expect(html).toContain(">Price<");
    expect(html).toContain(">Sale<");
    expect(html).toContain(">Colors<");
    expect(html).toContain(">Bloom<");
    expect(html).toContain(">Height<");
    expect(html).toContain(">Hidden<");
  });

  it("renders the Image and Description column headers", () => {
    const html = renderTable();
    expect(html).toContain("Image");
    expect(html).toContain("Description");
  });

  it("renders the Actions column header", () => {
    const html = renderTable();
    expect(html).toContain("Actions");
  });

  it("renders sort buttons with aria-labels", () => {
    const html = renderTable();
    expect(html).toContain('aria-label="Name: Ascending"');
  });

  it("renders a row for each variety", () => {
    const html = renderTable({
      initialVarieties: [sampleVariety, secondVariety],
      initialTotalCount: 2,
    });
    expect(html).toContain("Cafe au Lait");
    expect(html).toContain("Thomas Edison");
  });
});

describe("InventoryTable pagination", () => {
  it("renders pagination controls", () => {
    const html = renderTable({
      initialTotalCount: 50,
      initialPageSize: 25,
    });
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
  });

  it("shows page summary text", () => {
    const html = renderTable({
      initialPage: 1,
      initialPageSize: 25,
      initialTotalCount: 50,
      initialVarieties: Array.from({ length: 50 }, (_, i) => ({
        ...sampleVariety,
        id: String(i + 1),
        name: `Variety ${i + 1}`,
      })),
    });
    expect(html).toContain("Page 1 of 2");
  });

  it("hides pagination when there are no varieties", () => {
    const html = renderTable({
      initialVarieties: [],
      initialTotalCount: 0,
    });
    expect(html).not.toContain("Previous");
    expect(html).not.toContain("Next");
  });
});

describe("InventoryTable empty state", () => {
  it("shows no-rows message when varieties list is empty", () => {
    const html = renderTable({
      initialVarieties: [],
      initialTotalCount: 0,
    });
    expect(html).toContain("No rows found.");
  });
});

describe("InventoryTable Add Variety", () => {
  it("renders the Add Variety button", () => {
    const html = renderTable();
    expect(html).toContain("Add Variety");
  });
});
