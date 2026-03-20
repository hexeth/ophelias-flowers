import { describe, expect, it } from "vitest";
import { CATALOG_PLACEHOLDER_IMAGE } from "./constants";
import { parseVarietyInput, varietyInputSchema } from "./schema";

const validInput = {
  name: "Café au Lait",
  description: "Large blush blooms.",
  price: 12.5,
  salePrice: "10.5",
  stock: "available",
  category: "decorative",
  color: ["Blush", "cream", "blush"],
  bloomSize: "8-10 inches",
  height: "3-4 feet",
  imageUrl: "",
  imageKey: null,
  hidden: false,
};

describe("varietyInputSchema", () => {
  it("normalizes a valid payload", () => {
    const result = parseVarietyInput(validInput);

    expect(result.salePrice).toBe(10.5);
    expect(result.color).toEqual(["blush", "cream"]);
    expect(result.imageUrl).toBe(CATALOG_PLACEHOLDER_IMAGE);
  });

  it("rejects an invalid SKU", () => {
    const result = varietyInputSchema.safeParse({
      ...validInput,
      sku: "invalid-sku",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["sku"]);
  });

  it("rejects a sale price higher than the base price", () => {
    const result = varietyInputSchema.safeParse({
      ...validInput,
      salePrice: 14,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["salePrice"]);
  });

  it("rejects empty color values", () => {
    const result = varietyInputSchema.safeParse({
      ...validInput,
      color: ["   "],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["color", 0]);
  });
});
