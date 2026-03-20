import type { APIRoute } from "astro";
import { CATALOG_PLACEHOLDER_IMAGE } from "../../../lib/catalog/constants";

export const prerender = false;

const allowedImageTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maxImageSizeBytes = 5 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getVarietyImagesBucket(locals: App.Locals) {
  const bucket = locals.runtime.env.VARIETY_IMAGES;

  if (!bucket) {
    return null;
  }

  return bucket;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.auth().userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const varietyImages = getVarietyImagesBucket(locals);
  if (!varietyImages) {
    return json({ error: "Variety image storage is not configured." }, 500);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Please attach an image file." }, 400);
  }

  if (!allowedImageTypes.has(file.type)) {
    return json({ error: "Upload a JPG, PNG, WebP, or AVIF image." }, 400);
  }

  if (file.size > maxImageSizeBytes) {
    return json({ error: "Upload an image smaller than 5 MB." }, 400);
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ".jpg";
  const imageKey = `varieties/${crypto.randomUUID()}${extension.toLowerCase()}`;
  const imageBuffer = await file.arrayBuffer();

  await varietyImages.put(imageKey, imageBuffer, {
    httpMetadata: {
      contentType: file.type || "image/jpeg",
    },
  });

  const imageUrl = `/catalog-images/${imageKey}`;

  return json({ imageKey, imageUrl: imageUrl || CATALOG_PLACEHOLDER_IMAGE });
};
