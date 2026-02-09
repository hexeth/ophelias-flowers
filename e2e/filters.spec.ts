import { test, expect, type Page, type Locator } from "@playwright/test";

/** Helper — navigate to the varieties page and wait for filters to be ready. */
async function goToVarieties(page: Page) {
  await page.goto("/varieties");
  await expect(page.locator("#filters")).toBeVisible();
}

/** Helper — get all currently visible variety cards. */
function visibleItems(page: Page): Locator {
  return page.locator(".variety-item:visible");
}

/** Helper — get the displayed count text. */
function visibleCount(page: Page): Locator {
  return page.locator("#visible-count");
}

// ---------------------------------------------------------------------------
// Filter UI rendering
// ---------------------------------------------------------------------------

test.describe("filter UI", () => {
  test("renders category, color, and in-stock filters", async ({ page }) => {
    await goToVarieties(page);

    await expect(page.locator('[data-filter-group="category"]')).toBeVisible();
    await expect(page.locator('[data-filter-group="color"]')).toBeVisible();
    await expect(page.locator("#in-stock")).toBeVisible();
  });

  test("category dropdown lists options with counts", async ({ page }) => {
    await goToVarieties(page);

    // Open the category dropdown
    await page.locator('[data-filter-group="category"] summary').click();

    // Should contain the categories present in the catalog
    const categoryPanel = page.locator('[data-filter-group="category"] label');
    await expect(categoryPanel.first()).toBeVisible();

    // Ball (1) and Decorative (2) are the two categories in the test data
    await expect(
      page.locator('[data-filter-group="category"] input[value="ball"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-filter-group="category"] input[value="decorative"]'),
    ).toBeVisible();
  });

  test("color dropdown lists options with counts", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="color"] summary').click();

    // Colors in the test data: apricot, cream, orange, pink, rose
    await expect(
      page.locator('[data-filter-group="color"] input[value="pink"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-filter-group="color"] input[value="orange"]'),
    ).toBeVisible();
  });

  test("only one dropdown opens at a time", async ({ page }) => {
    await goToVarieties(page);

    // Open category
    await page.locator('[data-filter-group="category"] summary').click();
    await expect(
      page.locator('[data-filter-group="category"]'),
    ).toHaveAttribute("open", "");

    // Open color — category should close
    await page.locator('[data-filter-group="color"] summary').click();
    await expect(page.locator('[data-filter-group="color"]')).toHaveAttribute(
      "open",
      "",
    );
    await expect(
      page.locator('[data-filter-group="category"]'),
    ).not.toHaveAttribute("open", "");
  });

  test("dropdown closes when clicking outside", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="category"] summary').click();
    await expect(
      page.locator('[data-filter-group="category"]'),
    ).toHaveAttribute("open", "");

    // Click on the page heading (outside any filter)
    await page.getByRole("heading", { name: "All Varieties" }).click();
    await expect(
      page.locator('[data-filter-group="category"]'),
    ).not.toHaveAttribute("open", "");
  });
});

// ---------------------------------------------------------------------------
// Category filtering
// ---------------------------------------------------------------------------

test.describe("category filter", () => {
  test("selecting a category filters the grid", async ({ page }) => {
    await goToVarieties(page);

    // All 4 should be visible initially (3 real + 1 test fixture)
    await expect(visibleItems(page)).toHaveCount(4);

    // Open category dropdown and select "ball"
    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();

    // Only Jowey Linda (ball) should remain
    await expect(visibleItems(page)).toHaveCount(1);
    await expect(visibleCount(page)).toHaveText("1");
  });

  test("selecting multiple categories shows the union", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();
    await page
      .locator('[data-filter-group="category"] input[value="decorative"]')
      .check();

    // Both categories = all 4 varieties (decorative includes test fixture)
    await expect(visibleItems(page)).toHaveCount(4);
    await expect(visibleCount(page)).toHaveText("4");
  });

  test("deselecting all categories restores full list", async ({ page }) => {
    await goToVarieties(page);

    // Select then deselect
    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();
    await expect(visibleItems(page)).toHaveCount(1);

    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .uncheck();
    await expect(visibleItems(page)).toHaveCount(4);
    await expect(visibleCount(page)).toHaveText("4");
  });
});

// ---------------------------------------------------------------------------
// Color filtering
// ---------------------------------------------------------------------------

test.describe("color filter", () => {
  test("selecting a color filters the grid", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="orange"]')
      .check();

    // Only Jowey Linda has orange
    await expect(visibleItems(page)).toHaveCount(1);
    await expect(visibleCount(page)).toHaveText("1");
  });

  test("selecting a shared color shows matching varieties", async ({
    page,
  }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="pink"]')
      .check();

    // Bracken Rose (pink, rose), Café au Lait Mini (cream, pink, rose), and test fixture (pink, white)
    await expect(visibleItems(page)).toHaveCount(3);
    await expect(visibleCount(page)).toHaveText("3");
  });

  test("selecting multiple colors unions the results", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="orange"]')
      .check();
    await page
      .locator('[data-filter-group="color"] input[value="cream"]')
      .check();

    // Jowey Linda (orange) + Café au Lait Mini (cream) = 2
    await expect(visibleItems(page)).toHaveCount(2);
  });
});

// ---------------------------------------------------------------------------
// Combined filters (category + color)
// ---------------------------------------------------------------------------

test.describe("combined filters", () => {
  test("category and color narrow results together", async ({ page }) => {
    await goToVarieties(page);

    // Filter to ball category
    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();
    await expect(visibleItems(page)).toHaveCount(1);

    // Now also filter to pink — ball + pink = 0 matches
    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="pink"]')
      .check();
    await expect(visibleItems(page)).toHaveCount(0);
    await expect(visibleCount(page)).toHaveText("0");

    // No-results message should show
    await expect(page.locator("#no-results")).toBeVisible();
  });

  test("removing one filter widens results back", async ({ page }) => {
    await goToVarieties(page);

    // Apply both category=ball and color=pink (0 results)
    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();
    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="pink"]')
      .check();
    await expect(visibleItems(page)).toHaveCount(0);

    // Remove category filter — pink varieties should appear
    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .uncheck();
    await expect(visibleItems(page)).toHaveCount(3);
  });
});

// ---------------------------------------------------------------------------
// In-stock filter
// ---------------------------------------------------------------------------

test.describe("in-stock filter", () => {
  test("checking in-stock hides sold-out varieties", async ({ page }) => {
    await goToVarieties(page);

    // Only the test fixture is in-stock; the 3 real varieties are sold-out
    await page.locator("#in-stock").check();
    await expect(visibleItems(page)).toHaveCount(1);
    await expect(visibleCount(page)).toHaveText("1");
  });

  test("unchecking in-stock restores all varieties", async ({ page }) => {
    await goToVarieties(page);

    await page.locator("#in-stock").check();
    await expect(visibleItems(page)).toHaveCount(1);

    await page.locator("#in-stock").uncheck();
    await expect(visibleItems(page)).toHaveCount(4);
    await expect(visibleCount(page)).toHaveText("4");
  });
});

// ---------------------------------------------------------------------------
// Summary text updates
// ---------------------------------------------------------------------------

test.describe("filter summary text", () => {
  test("shows single selection name in summary", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();

    await expect(
      page.locator('[data-filter-group="category"] .filter-summary-text'),
    ).toHaveText("Ball");
  });

  test('shows "N selected" for multiple selections', async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="color"] summary').click();
    await page
      .locator('[data-filter-group="color"] input[value="pink"]')
      .check();
    await page
      .locator('[data-filter-group="color"] input[value="orange"]')
      .check();

    await expect(
      page.locator('[data-filter-group="color"] .filter-summary-text'),
    ).toHaveText("2 selected");
  });

  test("resets to all label when deselecting everything", async ({ page }) => {
    await goToVarieties(page);

    await page.locator('[data-filter-group="category"] summary').click();
    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .check();
    await expect(
      page.locator('[data-filter-group="category"] .filter-summary-text'),
    ).toHaveText("Ball");

    await page
      .locator('[data-filter-group="category"] input[value="ball"]')
      .uncheck();
    await expect(
      page.locator('[data-filter-group="category"] .filter-summary-text'),
    ).toHaveText("All Categories");
  });
});
