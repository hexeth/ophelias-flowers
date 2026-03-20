import type { APIRoute } from "astro";
import { ZodError } from "zod";
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

function handleAdminVarietiesError(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      {
        error: error.issues[0]?.message ?? "Please review the variety details.",
      },
      400,
    );
  }

  console.error("Admin varieties request failed", error);
  return json({ error: "Unable to save variety right now." }, 500);
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.auth().userId) {
    return unauthorized();
  }

  try {
    const varieties = await listAdminVarieties(locals);
    return json({ varieties });
  } catch (error) {
    console.error("Unable to list admin varieties", error);
    return json({ error: "Unable to load varieties right now." }, 500);
  }
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
    return handleAdminVarietiesError(error);
  }
};
