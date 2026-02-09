import { unlinkSync, existsSync } from "node:fs";
import { FIXTURE_PATH } from "./global-setup";

/**
 * Playwright global teardown — removes the test fixture variety
 * so it never persists in the content directory after a test run.
 */
async function globalTeardown() {
  if (existsSync(FIXTURE_PATH)) {
    unlinkSync(FIXTURE_PATH);
    console.log("[teardown] Removed test fixture → e2e-test-variety.md");
  }
}

export default globalTeardown;
