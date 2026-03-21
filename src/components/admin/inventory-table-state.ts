import type { InventoryRow } from "../../lib/catalog/admin-inventory-table";

export function createDraftRow(): InventoryRow {
  const id = `draft-${crypto.randomUUID()}`;
  return {
    id,
    slug: "",
    name: "",
    sku: "",
    description: "",
    price: 0,
    salePrice: null,
    stock: "available",
    category: "decorative",
    color: ["blush"],
    bloomSize: "",
    height: "",
    imageUrl: "/catalog-seed/placeholder-variety.jpg",
    imageKey: null,
    hidden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isNew: true,
  };
}

export function updateRow(
  rows: InventoryRow[],
  rowId: string,
  updater: (row: InventoryRow) => InventoryRow,
) {
  return rows.map((row) => (row.id === rowId ? updater(row) : row));
}

export function omitRowSnapshot(
  rows: Record<string, InventoryRow>,
  rowIds: string[],
) {
  const next = { ...rows };

  for (const rowId of rowIds) {
    delete next[rowId];
  }

  return next;
}

function normalizeColorValue(value: string) {
  return value.trim().toLowerCase();
}

export function getColorOptions(rows: InventoryRow[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => row.color)
        .map(normalizeColorValue)
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function getPinnedRows(
  rows: InventoryRow[],
  editingRowIds: Record<string, boolean>,
) {
  return rows.filter(
    (row) => row.isNew === true && editingRowIds[row.id] === true,
  );
}
