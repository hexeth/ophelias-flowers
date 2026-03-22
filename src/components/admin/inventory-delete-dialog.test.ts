import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryDeleteDialog } from "./inventory-delete-dialog";
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

function renderDialog(
  overrides: Partial<Parameters<typeof InventoryDeleteDialog>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(InventoryDeleteDialog, {
      confirmDeleteRow: sampleRow,
      deleteDialogRef: createRef<HTMLDialogElement>(),
      deletingRowId: null,
      onClose: vi.fn(),
      onConfirmDelete: vi.fn(),
      ...overrides,
    }),
  );
}

describe("InventoryDeleteDialog", () => {
  it("renders a native dialog element", () => {
    const html = renderDialog();
    expect(html).toContain("<dialog");
    expect(html).toContain("</dialog>");
  });

  it("shows the variety name in the confirmation heading", () => {
    const html = renderDialog();
    expect(html).toContain("Delete Cafe au Lait?");
  });

  it("falls back to generic text when the name is empty", () => {
    const html = renderDialog({
      confirmDeleteRow: { ...sampleRow, name: "" },
    });
    expect(html).toContain("Delete this variety?");
  });

  it("falls back to generic text when name is whitespace", () => {
    const html = renderDialog({
      confirmDeleteRow: { ...sampleRow, name: "   " },
    });
    expect(html).toContain("Delete this variety?");
  });

  it("includes the confirmation label", () => {
    const html = renderDialog();
    expect(html).toContain("Confirm deletion");
  });

  it("includes a warning about the action being irreversible", () => {
    const html = renderDialog();
    expect(html).toContain("cannot be undone");
  });

  it("renders a Cancel button", () => {
    const html = renderDialog();
    expect(html).toContain("Cancel");
  });

  it("renders the Delete variety button", () => {
    const html = renderDialog();
    expect(html).toContain("Delete variety");
  });

  it("shows Deleting text when the row is being deleted", () => {
    const html = renderDialog({
      deletingRowId: "row-1",
    });
    expect(html).toContain("Deleting");
    expect(html).not.toContain("Delete variety");
  });

  it("disables the delete button when deletion is in progress", () => {
    const html = renderDialog({
      deletingRowId: "row-1",
    });
    const deleteButtonIndex = html.indexOf("Deleting");
    const buttonSlice = html.slice(
      html.lastIndexOf("<button", deleteButtonIndex),
      deleteButtonIndex,
    );
    expect(buttonSlice).toContain("disabled");
  });

  it("disables the delete button when no row is set for confirmation", () => {
    const html = renderDialog({
      confirmDeleteRow: null,
    });
    expect(html).toContain("disabled");
  });

  it("has an accessible label via aria-labelledby", () => {
    const html = renderDialog();
    expect(html).toContain('aria-labelledby="delete-variety-title"');
    expect(html).toContain('id="delete-variety-title"');
  });
});
