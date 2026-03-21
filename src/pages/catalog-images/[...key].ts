import type { APIRoute } from "astro";

export const prerender = false;

const cacheControl = "public, max-age=31536000, immutable";

type SupportedFit = "cover" | "contain" | "scale-down";
type SupportedFormat = "auto" | "avif" | "webp" | "jpeg" | "png";

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
    format?: Exclude<SupportedFormat, "auto">;
  };
}

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
    value === "png"
  ) {
    return value;
  }

  return undefined;
}

function getVariantOptions(url: URL): VariantOptions {
  return {
    width: parseIntegerParam(url.searchParams.get("w"), 64, 2400),
    quality: parseIntegerParam(url.searchParams.get("q"), 30, 95),
    fit: parseFit(url.searchParams.get("fit")),
    format: parseFormat(url.searchParams.get("format")),
  };
}

function hasVariants(options: VariantOptions) {
  return Boolean(
    options.width || options.quality || options.fit || options.format,
  );
}

function getResponseEtag(etag: string) {
  return etag.startsWith('"') ? etag : `"${etag}"`;
}

function getNotModifiedResponse(headers: Headers) {
  return new Response(null, {
    status: 304,
    headers,
  });
}

function setVariantVaryHeader(headers: Headers, hasVariant: boolean) {
  if (!hasVariant) {
    return;
  }

  headers.set("vary", "accept");
}

function parseConditionalEtag(headerValue: string | null) {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function etagMatches(requestEtags: string[], responseEtag: string) {
  if (requestEtags.includes("*")) {
    return true;
  }

  return requestEtags.some((requestEtag) => {
    if (requestEtag === responseEtag) {
      return true;
    }

    if (requestEtag.startsWith("W/")) {
      return requestEtag.slice(2) === responseEtag;
    }

    return false;
  });
}

function buildImageHeaders(object: R2Object) {
  const headers = new Headers();
  const metadata = object.httpMetadata;

  if (metadata?.contentType) {
    headers.set("content-type", metadata.contentType);
  }

  if (metadata?.contentLanguage) {
    headers.set("content-language", metadata.contentLanguage);
  }

  if (metadata?.contentDisposition) {
    headers.set("content-disposition", metadata.contentDisposition);
  }

  if (metadata?.contentEncoding) {
    headers.set("content-encoding", metadata.contentEncoding);
  }

  if (metadata?.cacheControl) {
    headers.set("cache-control", metadata.cacheControl);
  } else {
    headers.set("cache-control", cacheControl);
  }

  if (metadata?.cacheExpiry) {
    headers.set("expires", metadata.cacheExpiry.toUTCString());
  }

  headers.set("etag", getResponseEtag(object.httpEtag));
  headers.set("content-length", String(object.size));

  return headers;
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "cache-control": "public, max-age=60",
    },
  });
}

function storageUnavailable() {
  return new Response("Variety image storage is not configured.", {
    status: 500,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function getObjectKey(param: string | undefined) {
  if (!param) {
    return null;
  }

  const trimmed = param.replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

async function maybeRespondNotModified(
  request: Request,
  object: R2Object,
  headers: Headers,
) {
  const requestEtags = parseConditionalEtag(
    request.headers.get("if-none-match"),
  );
  const responseEtag = getResponseEtag(object.httpEtag);

  if (requestEtags.length > 0 && etagMatches(requestEtags, responseEtag)) {
    return getNotModifiedResponse(headers);
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (ifModifiedSince) {
    const parsedDate = Date.parse(ifModifiedSince);
    if (!Number.isNaN(parsedDate) && object.uploaded.getTime() <= parsedDate) {
      return getNotModifiedResponse(headers);
    }
  }

  return null;
}

function buildVariantSourceUrl(request: Request, objectKey: string) {
  const baseUrl = new URL(request.url);
  baseUrl.search = "";
  baseUrl.pathname = `/catalog-images/${objectKey}`;
  return baseUrl.toString();
}

async function getVariantResponse(
  request: Request,
  objectKey: string,
  options: VariantOptions,
  responseHeaders: Headers,
) {
  const sourceUrl = buildVariantSourceUrl(request, objectKey);
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
    cfImage.format = options.format;
  }

  const transformed = await fetch(sourceUrl, {
    headers: {
      accept: request.headers.get("accept") ?? "image/*,*/*;q=0.8",
    },
    cf: {
      image: cfImage,
    } as RequestInitCfProperties,
  } as RequestInit<RequestInitCfProperties>);

  const headers = new Headers(responseHeaders);
  setVariantVaryHeader(headers, true);

  const contentType = transformed.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const contentLength = transformed.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  } else {
    headers.delete("content-length");
  }

  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}

async function handleRequest(
  request: Request,
  locals: App.Locals,
  param: string | undefined,
) {
  const bucket = locals.runtime.env.VARIETY_IMAGES;
  if (!bucket) {
    return storageUnavailable();
  }

  const objectKey = getObjectKey(param);
  if (!objectKey) {
    return notFound();
  }

  const object = await bucket.get(objectKey, {
    onlyIf: undefined,
  });

  if (!object) {
    return notFound();
  }

  const headers = buildImageHeaders(object);
  const variantOptions = getVariantOptions(new URL(request.url));
  setVariantVaryHeader(headers, hasVariants(variantOptions));

  const notModified = await maybeRespondNotModified(request, object, headers);
  if (notModified) {
    return notModified;
  }

  if (hasVariants(variantOptions)) {
    return getVariantResponse(request, objectKey, variantOptions, headers);
  }

  return new Response(object.body, {
    headers,
  });
}

async function handleHeadRequest(
  request: Request,
  locals: App.Locals,
  param: string | undefined,
) {
  const bucket = locals.runtime.env.VARIETY_IMAGES;
  if (!bucket) {
    return storageUnavailable();
  }

  const objectKey = getObjectKey(param);
  if (!objectKey) {
    return notFound();
  }

  const object = await bucket.head(objectKey);
  if (!object) {
    return notFound();
  }

  const headers = buildImageHeaders(object);
  const variantOptions = getVariantOptions(new URL(request.url));
  setVariantVaryHeader(headers, hasVariants(variantOptions));
  if (hasVariants(variantOptions)) {
    headers.delete("content-length");
  }

  const notModified = await maybeRespondNotModified(request, object, headers);
  if (notModified) {
    return notModified;
  }

  return new Response(null, {
    headers,
  });
}

export const GET: APIRoute = async ({ request, params, locals }) =>
  handleRequest(request, locals, params.key);

export const HEAD: APIRoute = async ({ request, params, locals }) =>
  handleHeadRequest(request, locals, params.key);
