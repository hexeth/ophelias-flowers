import { describe, it, expect } from "vitest";
import {
  createEmptyCart,
  addItem,
  removeItem,
  updateQuantity,
  getCartItemCount,
  getCartSubtotal,
} from "./cart";

const sampleItem = { sku: "DAH-CAL-001", name: "Café au Lait", price: 8.5 };
const anotherItem = {
  sku: "DAH-BOL-002",
  name: "Bishop of Llandaff",
  price: 7.0,
};

describe("cart", () => {
  it("creates an empty cart", () => {
    const cart = createEmptyCart();
    expect(cart.items).toEqual([]);
  });

  it("adds an item to an empty cart", () => {
    const cart = addItem(createEmptyCart(), sampleItem);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ ...sampleItem, quantity: 1 });
  });

  it("increments quantity when adding an existing item", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = addItem(cart, sampleItem);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(2);
  });

  it("removes an item by SKU", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = addItem(cart, anotherItem);
    cart = removeItem(cart, sampleItem.sku);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.sku).toBe(anotherItem.sku);
  });

  it("updates item quantity", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = updateQuantity(cart, sampleItem.sku, 5);
    expect(cart.items[0]?.quantity).toBe(5);
  });

  it("removes item when quantity is set to 0", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = updateQuantity(cart, sampleItem.sku, 0);
    expect(cart.items).toHaveLength(0);
  });

  it("calculates item count across multiple items", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = addItem(cart, sampleItem);
    cart = addItem(cart, anotherItem);
    expect(getCartItemCount(cart)).toBe(3);
  });

  it("calculates subtotal correctly", () => {
    let cart = addItem(createEmptyCart(), sampleItem);
    cart = addItem(cart, sampleItem); // 2 × $8.50
    cart = addItem(cart, anotherItem); // 1 × $7.00
    expect(getCartSubtotal(cart)).toBe(24.0);
  });
});
