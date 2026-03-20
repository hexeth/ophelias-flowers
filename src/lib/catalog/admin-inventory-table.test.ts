import { describe, expect, it } from "vitest";
import {
  applyInventoryTableControls,
  getInventoryRowSearchScore,
  type InventoryRow,
  type InventoryTableFilters,
  type InventoryTableSort,
} from "./admin-inventory-table";

const baseFilters: InventoryTableFilters = {
  category: "all",
  stock: "all",
  visibility: "all",
  query: "",
};

const baseSort: InventoryTableSort = {
  direction: "asc",
  field: "name",
};

const rows: InventoryRow[] = [
  {
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
  },
  {
    id: "2",
    slug: "jowey-linda",
    name: "Jowey Linda",
    sku: "DAH-JLI-002",
    description: "Compact ball with saturated orange petals.",
    price: 9,
    salePrice: 7.5,
    stock: "low",
    category: "ball",
    color: ["orange"],
    bloomSize: "3 inches",
    height: "3 feet",
    imageUrl: "/images/jowey.jpg",
    imageKey: null,
    hidden: true,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "3",
    slug: "bracken-rose",
    name: "Bracken Rose",
    sku: "DAH-BRO-003",
    description: "Rose-pink decorative blooms with warm undertones.",
    price: 10,
    salePrice: null,
    stock: "sold-out",
    category: "decorative",
    color: ["pink", "rose"],
    bloomSize: "5 inches",
    height: "4 feet",
    imageUrl: "/images/bracken.jpg",
    imageKey: null,
    hidden: false,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-13T00:00:00.000Z",
  },
];

describe("getInventoryRowSearchScore", () => {
  it("matches substrings and subsequences across core fields", () => {
    expect(getInventoryRowSearchScore(rows[0], "cafe")).toBe(0);
    expect(getInventoryRowSearchScore(rows[1], "jli")).not.toBeNull();
    expect(getInventoryRowSearchScore(rows[2], "purple")).toBeNull();
  });

  it("supports multi-term queries across different fields", () => {
    expect(getInventoryRowSearchScore(rows[0], "blush cal-001")).not.toBeNull();
    expect(getInventoryRowSearchScore(rows[1], "orange ball")).not.toBeNull();
  });
});

describe("applyInventoryTableControls", () => {
  it("filters rows by category, stock, visibility, and fuzzy query", () => {
    const filtered = applyInventoryTableControls(
      rows,
      {
        category: "ball",
        stock: "low",
        visibility: "hidden",
        query: "orange",
      },
      baseSort,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Jowey Linda");
  });

  it("sorts rows by the selected field after ranking fuzzy matches", () => {
    const filtered = applyInventoryTableControls(
      rows,
      {
        ...baseFilters,
        query: "rose",
      },
      {
        direction: "desc",
        field: "updatedAt",
      },
    );

    expect(filtered.map((row) => row.name)).toEqual(["Bracken Rose"]);
  });

  it("sorts by price when no search query is active", () => {
    const filtered = applyInventoryTableControls(rows, baseFilters, {
      direction: "asc",
      field: "price",
    });

    expect(filtered.map((row) => row.name)).toEqual([
      "Jowey Linda",
      "Bracken Rose",
      "Cafe au Lait",
    ]);
  });
});
