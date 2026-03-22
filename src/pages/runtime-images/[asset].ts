import type { APIRoute } from "astro";
import heroImage from "../../assets/hero.jpg";
import logoImage from "../../assets/logo.png";
import {
  MAX_IMAGE_QUALITY,
  MAX_IMAGE_WIDTH,
  MIN_IMAGE_QUALITY,
  MIN_IMAGE_WIDTH,
} from "../../lib/catalog/image-urls";

type SupportedFit = "cover" | "contain" | "scale-down";
type SupportedFormat = "auto" | "avif" | "webp" | "jpeg" | "jpg" | "png";

interface VariantOptions {
  width?: number;
  quality?: number;
  fit?: SupportedFit;
  format?: SupportedFormat;
}

interface CfImageRequest {
  image: {
    width?: number;
    quality?: number;
    fit?: SupportedFit;
    format?: "avif" | "webp" | "jpeg" | "png";
  };
}

export const prerender = false;

const cacheControl = "public, max-age=31536000, immutable";
const fallbackCacheControl = "public, max-age=300";

const assetSources = {
  hero: heroImage.src,
  logo: logoImage.src,
} as const;

function parseIntegerParam(value: string | null, min: number, max: number) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseFit(value: string | null): SupportedFit | undefined {
  if (value === "cover" || value === "contain" || value === "scale-down") {
    return value;
  }

  return undefined;
}

function parseFormat(value: string | null): SupportedFormat | undefined {
  if (
    value === "auto" ||
    value === "avif" ||
    value === "webp" ||
    value === "jpeg" ||
    value === "jpg" ||
    value === "png"
  ) {
    return value;
  }

  return undefined;
}

function getVariantOptions(url: URL): VariantOptions {
  return {
    width: parseIntegerParam(
      url.searchParams.get("w"),
      MIN_IMAGE_WIDTH,
      MAX_IMAGE_WIDTH,
    ),
    quality: parseIntegerParam(
      url.searchParams.get("q"),
      MIN_IMAGE_QUALITY,
      MAX_IMAGE_QUALITY,
    ),
    fit: parseFit(url.searchParams.get("fit")),
    format: parseFormat(url.searchParams.get("format")),
  };
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "cache-control": "public, max-age=60",
    },
  });
}

function badRequest(message: string) {
  return new Response(message, {
    status: 400,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function expectedMimeForFormat(format: SupportedFormat | undefined) {
  if (format === "avif") {
    return "image/avif";
  }

  if (format === "webp") {
    return "image/webp";
  }

  if (format === "jpeg" || format === "jpg") {
    return "image/jpeg";
  }

  if (format === "png") {
    return "image/png";
  }

  return undefined;
}

async function transformedResponse(request: Request, sourcePath: string) {
  const sourceUrl = new URL(sourcePath, request.url);
  const options = getVariantOptions(new URL(request.url));
  const acceptHeader = request.headers.get("accept") ?? "image/*,*/*;q=0.8";
  const cfImage: CfImageRequest["image"] = {};

  if (options.width) {
    cfImage.width = options.width;
  }

  if (options.quality) {
    cfImage.quality = options.quality;
  }

  if (options.fit) {
    cfImage.fit = options.fit;
  }

  if (options.format && options.format !== "auto") {
    cfImage.format = options.format === "jpg" ? "jpeg" : options.format;
  } else if (options.format === "auto") {
    if (acceptHeader.includes("image/avif")) {
      cfImage.format = "avif";
    } else if (acceptHeader.includes("image/webp")) {
      cfImage.format = "webp";
    }
  }

  const transformed = await fetch(sourceUrl, {
    headers: {
      accept: acceptHeader,
    },
    cf: {
      image: cfImage,
    } as RequestInitCfProperties,
  } as RequestInit<RequestInitCfProperties>);

  if (!transformed.ok) {
    return new Response(transformed.body, {
      status: transformed.status,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const expectedMime = expectedMimeForFormat(options.format);
  const actualMime = transformed.headers.get("content-type") ?? "";

  const headers = new Headers();
  headers.set("cache-control", cacheControl);
  headers.set("x-image-transform", "applied");

  if (expectedMime && !actualMime.includes(expectedMime)) {
    // Degrade safely when transforms are unavailable (e.g. local dev), but expose
    // a signal for probes and observability and avoid long caching of mismatches.
    headers.set("cache-control", fallbackCacheControl);
    headers.set("x-image-transform", "format-mismatch");
  }

  const contentType = transformed.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const contentLength = transformed.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  }

  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}

export const GET: APIRoute = async ({ request, params }) => {
  const asset = params.asset;
  if (!asset) {
    return badRequest("Missing asset path");
  }

  if (!(asset in assetSources)) {
    return notFound();
  }

  const sourcePath = assetSources[asset as keyof typeof assetSources];
  return transformedResponse(request, sourcePath);
};
