/**
 * Playwright global setup — warms up the Astro dev server.
 *
 * Vite's SSR module runner compiles pages on first request, which can take
 * 30-60s in dev. This setup hits key pages before tests start so the module
 * cache is primed and individual tests don't time out.
 */
async function globalSetup() {
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
