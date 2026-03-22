import { describe, expect, it } from "vitest";
import {
  createDraftRow,
  getColorOptions,
  getPinnedRows,
  omitRowSnapshot,
  updateRow,
} from "./inventory-table-state";
import type { InventoryRow } from "../../lib/catalog/admin-inventory-table";

function makeRow(overrides: Partial<InventoryRow> = {}): InventoryRow {
  return {
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
    ...overrides,
  };
}

describe("createDraftRow", () => {
  it("returns a row with isNew set to true", () => {
    const draft = createDraftRow();
    expect(draft.isNew).toBe(true);
  });

  it("assigns a unique draft id", () => {
    const a = createDraftRow();
    const b = createDraftRow();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^draft-/);
  });

  it("uses reasonable defaults for a new variety", () => {
    const draft = createDraftRow();
    expect(draft.name).toBe("");
    expect(draft.stock).toBe("available");
    expect(draft.category).toBe("decorative");
    expect(draft.price).toBe(0);
  });
});

describe("updateRow", () => {
  it("applies the updater only to the matching row", () => {
    const rows = [makeRow({ id: "1" }), makeRow({ id: "2", name: "Dahlia B" })];
    const result = updateRow(rows, "1", (row) => ({ ...row, name: "Updated" }));

    expect(result[0].name).toBe("Updated");
    expect(result[1].name).toBe("Dahlia B");
  });

  it("returns a new array reference", () => {
    const rows = [makeRow()];
    const result = updateRow(rows, "row-1", (row) => ({ ...row, price: 99 }));

    expect(result).not.toBe(rows);
    expect(result[0].price).toBe(99);
  });

  it("leaves all rows unchanged when no id matches", () => {
    const rows = [makeRow({ id: "1" })];
    const result = updateRow(rows, "nonexistent", (row) => ({
      ...row,
      name: "X",
    }));

    expect(result[0].name).toBe("Cafe au Lait");
  });
});

describe("omitRowSnapshot", () => {
  it("removes specified ids from the snapshot record", () => {
    const snapshots: Record<string, InventoryRow> = {
      a: makeRow({ id: "a" }),
      b: makeRow({ id: "b" }),
      c: makeRow({ id: "c" }),
    };

    const result = omitRowSnapshot(snapshots, ["a", "c"]);
    expect(Object.keys(result)).toEqual(["b"]);
  });

  it("returns a new object reference", () => {
    const snapshots: Record<string, InventoryRow> = {
      a: makeRow({ id: "a" }),
    };

    const result = omitRowSnapshot(snapshots, ["a"]);
    expect(result).not.toBe(snapshots);
  });

  it("handles empty rowIds array", () => {
    const snapshots: Record<string, InventoryRow> = {
      a: makeRow({ id: "a" }),
    };

    const result = omitRowSnapshot(snapshots, []);
    expect(Object.keys(result)).toEqual(["a"]);
  });
});

describe("getColorOptions", () => {
  it("returns a sorted, deduplicated list of colors", () => {
    const rows = [
      makeRow({ color: ["cream", "Blush"] }),
      makeRow({ color: ["blush", " Pink "] }),
    ];

    const result = getColorOptions(rows);
    expect(result).toEqual(["blush", "cream", "pink"]);
  });

  it("normalizes colors to lowercase and trims whitespace", () => {
    const rows = [makeRow({ color: ["  RED  ", "Blue"] })];
    const result = getColorOptions(rows);
    expect(result).toEqual(["blue", "red"]);
  });

  it("filters out empty color strings", () => {
    const rows = [makeRow({ color: ["red", "", "  "] })];
    const result = getColorOptions(rows);
    expect(result).toEqual(["red"]);
  });

  it("returns an empty array when there are no rows", () => {
    expect(getColorOptions([])).toEqual([]);
  });
});

describe("getPinnedRows", () => {
  it("returns only new rows that are currently being edited", () => {
    const rows = [
      makeRow({ id: "draft-1", isNew: true }),
      makeRow({ id: "existing-1", isNew: false }),
      makeRow({ id: "draft-2", isNew: true }),
    ];
    const editingRowIds: Record<string, boolean> = {
      "draft-1": true,
      "existing-1": true,
    };

    const result = getPinnedRows(rows, editingRowIds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("draft-1");
  });

  it("returns empty array when no new rows are being edited", () => {
    const rows = [makeRow({ id: "existing-1", isNew: false })];
    const editingRowIds: Record<string, boolean> = { "existing-1": true };

    expect(getPinnedRows(rows, editingRowIds)).toEqual([]);
  });

  it("excludes new rows that are not being edited", () => {
    const rows = [makeRow({ id: "draft-1", isNew: true })];
    const editingRowIds: Record<string, boolean> = {};

    expect(getPinnedRows(rows, editingRowIds)).toEqual([]);
  });
});
