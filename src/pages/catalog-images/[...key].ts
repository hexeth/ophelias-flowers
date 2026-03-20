import type { APIRoute } from "astro";

export const prerender = false;

const cacheControl = "public, max-age=31536000, immutable";

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

  headers.set("etag", object.httpEtag);
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

async function handleRequest(locals: App.Locals, param: string | undefined) {
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

  return new Response(object.body, {
    headers,
  });
}

async function handleHeadRequest(
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

  return new Response(null, {
    headers: buildImageHeaders(object),
  });
}

export const GET: APIRoute = async ({ params, locals }) =>
  handleRequest(locals, params.key);

export const HEAD: APIRoute = async ({ params, locals }) =>
  handleHeadRequest(locals, params.key);
