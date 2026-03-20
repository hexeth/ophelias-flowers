import type { APIRoute } from "astro";
import { listAdminVarieties, saveVariety } from "../../../lib/varieties";

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.auth().userId) {
    return unauthorized();
  }

  const varieties = await listAdminVarieties(locals);
  return json({ varieties });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.auth().userId) {
    return unauthorized();
  }

  try {
    const payload = await request.json();
    const variety = await saveVariety(locals, payload);
    return json({ variety });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save variety.";
    return json({ error: message }, 400);
  }
};
