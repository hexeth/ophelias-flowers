import { describe, it, expect } from "vitest";
import { formatPrice } from "./pricing";

describe("formatPrice", () => {
  it("formats whole dollar amounts", () => {
    expect(formatPrice(7)).toBe("$7.00");
  });

  it("formats cents correctly", () => {
    expect(formatPrice(8.5)).toBe("$8.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatPrice(1234.56)).toBe("$1,234.56");
  });
});
