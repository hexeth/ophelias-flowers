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

describe("InventoryTable filter controls", () => {
  it("uses the shared field class for the filter input and all dropdowns", () => {
    const html = renderToStaticMarkup(
      createElement(InventoryTable, {
        initialVarieties: [sampleVariety],
      }),
    );
    const classOccurrences = html.split(inventoryFilterFieldClassName).length - 1;

    expect(classOccurrences).toBe(4);
    expect(html).toContain("Filter");
  });
});