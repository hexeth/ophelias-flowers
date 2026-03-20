import type { APIRoute } from "astro";

export const prerender = false;

const cacheControl = "public, max-age=31536000, immutable";

function buildImageHeaders(object: R2ObjectBody) {
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

function getObjectKey(param: string | undefined) {
  if (!param) {
    return null;
  }

  const trimmed = param.replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

async function handleRequest(locals: App.Locals, param: string | undefined) {
  const objectKey = getObjectKey(param);
  if (!objectKey) {
    return notFound();
  }

  const object = await locals.runtime.env.VARIETY_IMAGES.get(objectKey, {
    onlyIf: undefined,
  });

  if (!object) {
    return notFound();
  }

  const imageBuffer = await object.arrayBuffer();
  const headers = buildImageHeaders(object);
  headers.set("content-length", String(imageBuffer.byteLength));

  return new Response(imageBuffer, {
    headers,
  });
}

export const GET: APIRoute = async ({ params, locals }) =>
  handleRequest(locals, params.key);

export const HEAD: APIRoute = async ({ params, locals }) => {
  const response = await handleRequest(locals, params.key);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
};
