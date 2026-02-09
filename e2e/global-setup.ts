import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Test fixture content — a synthetic variety used by E2E tests.
 * Written to the content directory at setup, removed at teardown.
 * This keeps the fixture out of production builds.
 */
const FIXTURE_CONTENT = `---
name: "E2E Test Variety"
sku: "DAH-TST-001"
price: 12.50
stock: "available"
category: "decorative"
color: ["pink", "white"]
bloomSize: "6 inches"
height: "3 feet"
image: "/images/varieties/bracken-rose.jpg"
---

This variety exists solely as a stable test fixture for end-to-end tests.
`;

export const FIXTURE_PATH = resolve(
  import.meta.dirname,
  "../src/content/varieties/e2e-test-variety.md",
);

/**
 * Playwright global setup:
 * 1. Writes the test fixture variety into the content directory.
 * 2. Warms up the Astro dev server's Vite module cache so tests don't timeout.
 */
async function globalSetup() {
  // 1. Write fixture
  writeFileSync(FIXTURE_PATH, FIXTURE_CONTENT, "utf-8");
  console.log("[setup] Wrote test fixture → e2e-test-variety.md");

  // 2. Warm up dev server
  const baseURL = "http://localhost:4321";
  const pages = ["/", "/varieties", "/varieties/e2e-test-variety", "/cart"];

  console.log("[warmup] Priming Vite module cache…");

  for (const path of pages) {
    const url = `${baseURL}${path}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      console.log(`[warmup] ${path} → ${res.status}`);
    } catch (err) {
      console.warn(`[warmup] ${path} → failed (${(err as Error).message})`);
    }
  }

  console.log("[warmup] Done.");
}

export default globalSetup;
