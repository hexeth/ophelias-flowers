import type { Cart, LineItem } from "./types";

const CART_STORAGE_KEY = "ophelias-cart";

export function createEmptyCart(): Cart {
  return {
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addItem(cart: Cart, item: Omit<LineItem, "quantity">): Cart {
  const existing = cart.items.find((i) => i.sku === item.sku);
  const items = existing
    ? cart.items.map((i) =>
        i.sku === item.sku ? { ...i, quantity: i.quantity + 1 } : i,
      )
    : [...cart.items, { ...item, quantity: 1 }];

  return { items, updatedAt: new Date().toISOString() };
}

export function removeItem(cart: Cart, sku: string): Cart {
  return {
    items: cart.items.filter((i) => i.sku !== sku),
    updatedAt: new Date().toISOString(),
  };
}

export function updateQuantity(
  cart: Cart,
  sku: string,
  quantity: number,
): Cart {
  if (quantity <= 0) {
    return removeItem(cart, sku);
  }

  return {
    items: cart.items.map((i) => (i.sku === sku ? { ...i, quantity } : i)),
    updatedAt: new Date().toISOString(),
  };
}

export function getCartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(cart: Cart): number {
  return cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
}

export function loadCart(): Cart {
  if (typeof window === "undefined") {
    return createEmptyCart();
  }

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return createEmptyCart();
    return JSON.parse(raw) as Cart;
  } catch {
    return createEmptyCart();
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}
