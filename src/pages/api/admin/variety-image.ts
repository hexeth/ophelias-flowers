import type { APIRoute } from "astro";
import { CATALOG_PLACEHOLDER_IMAGE } from "../../../lib/catalog/constants";

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.auth().userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Please attach an image file." }, 400);
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ".jpg";
  const imageKey = `varieties/${crypto.randomUUID()}${extension.toLowerCase()}`;
  const imageBuffer = await file.arrayBuffer();

  await locals.runtime.env.VARIETY_IMAGES.put(imageKey, imageBuffer, {
    httpMetadata: {
      contentType: file.type || "image/jpeg",
    },
  });

  const imageUrl = `/catalog-images/${imageKey}`;

  return json({ imageKey, imageUrl: imageUrl || CATALOG_PLACEHOLDER_IMAGE });
};
