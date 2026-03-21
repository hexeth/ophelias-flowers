import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  deleteVariety,
  listAdminVarieties,
  saveVariety,
} from "../../../lib/varieties";

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

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.auth().userId) {
    return unauthorized();
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return json({ error: "A variety id is required." }, 400);
  }

  try {
    const variety = await deleteVariety(locals, id);
    if (!variety) {
      return json({ error: "Variety not found." }, 404);
    }

    return json({ variety });
  } catch (error) {
    console.error("Admin variety delete failed", error);
    return json({ error: "Unable to delete variety right now." }, 500);
  }
};
