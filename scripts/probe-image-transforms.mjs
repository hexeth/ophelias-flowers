import process from "node:process";

function usage() {
  console.error(
    "Usage: node scripts/probe-image-transforms.mjs <baseUrl> [--json]",
  );
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&#x26;", "&");
}

function extractUrlsFromSrcset(srcset, baseUrl) {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .map((value) => new URL(value, baseUrl).toString());
}

function pickFirstMatching(urls, matcher) {
  for (const value of urls) {
    if (matcher(value)) {
      return value;
    }
  }

  return undefined;
}

function parseHomepageCandidates(html, baseUrl) {
  const srcMatches = Array.from(html.matchAll(/\ssrc="([^"]+)"/g)).map(
    (match) => new URL(decodeHtmlEntities(match[1]), baseUrl).toString(),
  );
  const srcSetMatches = Array.from(
    html.matchAll(/\ssrcset="([^"]+)"/g),
  ).flatMap((match) =>
    extractUrlsFromSrcset(decodeHtmlEntities(match[1]), baseUrl),
  );
  const candidates = [...srcMatches, ...srcSetMatches];

  const unique = [...new Set(candidates)];

  return {
    hero:
      pickFirstMatching(unique, (url) =>
        /(hero|\/cdn-cgi\/image\/|\/_image\?href=.*hero|\/images\/home\/hero)/i.test(
          url,
        ),
      ) ?? null,
    logo:
      pickFirstMatching(unique, (url) =>
        /(logo|\/_image\?href=.*logo|\/images\/home\/logo)/i.test(url),
      ) ?? null,
    catalog:
      pickFirstMatching(
        unique,
        (url) => /\/catalog-images\//i.test(url) && /[?&](w|q|format)=/i.test(url),
      ) ?? pickFirstMatching(unique, (url) => /\/catalog-images\//i.test(url)) ?? null,
  };
}

async function probeUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });

    response.body?.cancel();

    return {
      url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      cacheControl: response.headers.get("cache-control"),
      cfResized: response.headers.get("cf-resized"),
      imageTransform: response.headers.get("x-image-transform"),
      server: response.headers.get("server"),
    };
  } catch (error) {
    return {
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const [, , rawBaseUrl, ...restArgs] = process.argv;
  if (!rawBaseUrl) {
    usage();
    process.exit(1);
  }

  const jsonMode = restArgs.includes("--json");
  const baseUrl = new URL(rawBaseUrl).toString();

  const homepageResponse = await fetch(baseUrl);
  const homepageHtml = await homepageResponse.text();
  const candidates = parseHomepageCandidates(homepageHtml, baseUrl);

  const checks = await Promise.all(
    Object.entries(candidates)
      .filter(([, value]) => Boolean(value))
      .map(async ([kind, value]) => ({
        kind,
        ...(await probeUrl(value)),
      })),
  );

  const report = {
    baseUrl,
    homepageStatus: homepageResponse.status,
    candidates,
    checks,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Image transform probe for ${baseUrl}`);
  console.log(`Homepage status: ${homepageResponse.status}`);
  for (const check of checks) {
    if (check.error) {
      console.log(`- ${check.kind}: ERROR ${check.error}`);
      continue;
    }

    const len = check.contentLength ?? "unknown";
    const type = check.contentType ?? "unknown";
    const cf = check.cfResized ?? "none";
    const transform = check.imageTransform ?? "none";
    console.log(
      `- ${check.kind}: ${check.status} type=${type} length=${len} cf-resized=${cf} transform=${transform}`,
    );
    console.log(`  ${check.url}`);
  }
}

await main();
