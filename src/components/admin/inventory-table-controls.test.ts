import { describe, expect, it } from "vitest";
import {
  inventoryFilterFieldClassName,
  inventoryFilterLabelClassName,
  inventoryFilterLabelTextClassName,
} from "./inventory-table-controls";

describe("inventory-table-controls", () => {
  it("exports a non-empty field class name", () => {
    expect(inventoryFilterFieldClassName).toBeTruthy();
    expect(typeof inventoryFilterFieldClassName).toBe("string");
  });

  it("exports a non-empty label class name", () => {
    expect(inventoryFilterLabelClassName).toBeTruthy();
    expect(typeof inventoryFilterLabelClassName).toBe("string");
  });

  it("exports a non-empty label text class name", () => {
    expect(inventoryFilterLabelTextClassName).toBeTruthy();
    expect(typeof inventoryFilterLabelTextClassName).toBe("string");
  });

  it("field class includes focus ring styles", () => {
    expect(inventoryFilterFieldClassName).toContain("focus:ring-2");
  });

  it("label text class uses uppercase tracking", () => {
    expect(inventoryFilterLabelTextClassName).toContain("uppercase");
    expect(inventoryFilterLabelTextClassName).toContain("tracking-widest");
  });
});
