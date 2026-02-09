import { test, expect } from "@playwright/test";

/**
 * Stable test fixture – see src/content/varieties/e2e-test-variety.md
 * Using a dedicated fixture avoids coupling tests to real catalog data.
 */
const FIXTURE = {
  slug: "e2e-test-variety",
  name: "E2E Test Variety",
  price: "$12.50",
} as const;

test.describe("homepage", () => {
  test("loads and displays site title", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Ophelia's Flowers" }),
    ).toBeVisible();
  });

  test("navigates to varieties page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Shop" })
      .click();
    await expect(page).toHaveURL(/\/varieties/);
    await expect(
      page.getByRole("heading", { name: "All Varieties" }),
    ).toBeVisible();
  });
});

test.describe("variety detail", () => {
  test("displays variety information", async ({ page }) => {
    await page.goto(`/varieties/${FIXTURE.slug}`);
    await expect(
      page.getByRole("heading", { name: FIXTURE.name }),
    ).toBeVisible();
    await expect(page.locator(`text=${FIXTURE.price}`)).toBeVisible();
  });

  test("shows add to cart button for available variety", async ({ page }) => {
    await page.goto(`/varieties/${FIXTURE.slug}`);
    await expect(page.locator("button#add-to-cart")).toBeVisible();
    await expect(page.locator("button#add-to-cart")).toContainText(
      "Add to Cart",
    );
  });
});

test.describe("cart", () => {
  test("cart page shows empty state", async ({ page }) => {
    await page.goto("/cart");
    await expect(
      page.getByRole("heading", { name: "Your Cart" }),
    ).toBeVisible();
    await expect(page.locator("#cart-empty")).toBeVisible();
  });

  test("adding an item updates cart", async ({ page }) => {
    await page.goto(`/varieties/${FIXTURE.slug}`);
    await page.click("button#add-to-cart");
    await expect(page.locator("button#add-to-cart")).toContainText("Added");
    await expect(page.locator("#cart-count")).toBeVisible();

    await page.goto("/cart");
    await expect(page.locator("#cart-contents")).toBeVisible();
    await expect(page.locator("#cart-items")).toContainText(FIXTURE.name);
  });
});

test.describe("checkout", () => {
  test("checkout page shows empty state without items", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("#checkout-empty")).toBeVisible();
  });

  test("checkout page shows form with items in cart", async ({ page }) => {
    await page.goto(`/varieties/${FIXTURE.slug}`);
    await page.click("button#add-to-cart");

    await page.goto("/checkout");
    await expect(page.locator("#checkout-form-wrapper")).toBeVisible();
    await expect(page.locator("#order-summary")).toContainText(FIXTURE.name);
    await expect(page.locator("form#preorder-form")).toBeVisible();
  });
});
