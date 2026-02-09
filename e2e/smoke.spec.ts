import { test, expect } from "@playwright/test";

test.describe("homepage", () => {
  test("loads and displays site title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Ophelia's Flowers")).toBeVisible();
  });

  test("navigates to varieties page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Shop");
    await expect(page).toHaveURL(/\/varieties/);
    await expect(page.locator("h1")).toContainText("All Varieties");
  });
});

test.describe("variety detail", () => {
  test("displays variety information", async ({ page }) => {
    await page.goto("/varieties/bracken-rose");
    await expect(page.locator("h1")).toContainText("Bracken Rose");
    await expect(page.locator("text=$8.00")).toBeVisible();
  });

  test("shows add to cart button for available variety", async ({ page }) => {
    await page.goto("/varieties/bracken-rose");
    await expect(page.locator("button#add-to-cart")).toBeVisible();
    await expect(page.locator("button#add-to-cart")).toContainText(
      "Add to Cart",
    );
  });
});

test.describe("cart", () => {
  test("cart page shows empty state", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("h1")).toContainText("Your Cart");
    await expect(page.locator("#cart-empty")).toBeVisible();
  });

  test("adding an item updates cart", async ({ page }) => {
    await page.goto("/varieties/bracken-rose");
    await page.click("button#add-to-cart");
    await expect(page.locator("button#add-to-cart")).toContainText("Added!");
    await expect(page.locator("#cart-count")).toBeVisible();

    await page.goto("/cart");
    await expect(page.locator("#cart-contents")).toBeVisible();
    await expect(page.locator("#cart-items")).toContainText("Bracken Rose");
  });
});

test.describe("checkout", () => {
  test("checkout page shows empty state without items", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("#checkout-empty")).toBeVisible();
  });

  test("checkout page shows form with items in cart", async ({ page }) => {
    // Add item to cart first
    await page.goto("/varieties/bracken-rose");
    await page.click("button#add-to-cart");

    await page.goto("/checkout");
    await expect(page.locator("#checkout-form-wrapper")).toBeVisible();
    await expect(page.locator("#order-summary")).toContainText("Bracken Rose");
    await expect(page.locator("form#preorder-form")).toBeVisible();
  });
});
