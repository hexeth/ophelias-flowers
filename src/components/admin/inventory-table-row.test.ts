import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryTableRow } from "./inventory-table-row";
import type { InventoryRow } from "../../lib/catalog/admin-inventory-table";

const sampleRow: InventoryRow = {
  id: "row-1",
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

const colorOptions = [
  { value: "cream", label: "cream" },
  { value: "blush", label: "blush" },
];

function renderRow(
  overrides: Partial<Parameters<typeof InventoryTableRow>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(InventoryTableRow, {
      row: sampleRow,
      colorOptions,
      isDeleting: false,
      isEditing: false,
      isSaving: false,
      onCancel: vi.fn(),
      onDelete: vi.fn(),
      onEdit: vi.fn(),
      onImageUpload: vi.fn(),
      onSave: vi.fn(),
      onValueChange: vi.fn(),
      ...overrides,
    }),
  );
}

describe("InventoryTableRow", () => {
  it("renders a table row element", () => {
    const html = renderRow();
    expect(html).toMatch(/^<tr/);
    expect(html).toMatch(/<\/tr>$/);
  });

  it("displays the variety name in view mode", () => {
    const html = renderRow();
    expect(html).toContain("Cafe au Lait");
  });

  it("displays the description in view mode", () => {
    const html = renderRow();
    expect(html).toContain("Cream blush dinnerplate blooms.");
  });

  it("shows the updated date in view mode", () => {
    const html = renderRow();
    expect(html).toContain("Updated");
  });

  it("displays a dash when description is empty in view mode", () => {
    const html = renderRow({
      row: { ...sampleRow, description: "" },
    });
    expect(html).toContain("—");
  });

  it("renders the image cell", () => {
    const html = renderRow();
    expect(html).toContain("/images/cafe.jpg");
  });

  it("includes RowActions with Edit and Delete in view mode", () => {
    const html = renderRow({ isEditing: false });
    expect(html).toContain(">Edit<");
    expect(html).toContain('aria-label="Delete variety"');
  });

  it("renders editable inputs when isEditing is true", () => {
    const html = renderRow({ isEditing: true });
    expect(html).toContain("<input");
    expect(html).toContain("<textarea");
  });

  it("renders a textarea for description when editing", () => {
    const html = renderRow({ isEditing: true });
    expect(html).toContain("<textarea");
  });

  it("displays the price value", () => {
    const html = renderRow();
    expect(html).toContain("12");
  });

  it("renders category and stock select options when editing", () => {
    const html = renderRow({ isEditing: true });
    expect(html).toContain("<select");
    expect(html).toContain("Decorative");
    expect(html).toContain("In Stock");
  });
});
