import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  deleteVariety,
  saveVariety,
  searchAdminVarieties,
} from "../../../lib/varieties";
import {
  clampPageSize,
  defaultAdminVarietySearchParams,
  parsePositiveInt,
  type InventorySortField,
  type InventoryTableFilters,
  type InventoryTableSort,
} from "../../../lib/catalog/search";

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

export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.auth().userId) {
    return unauthorized();
  }

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const sortField = (searchParams.get("sortField") ??
      defaultAdminVarietySearchParams.sort.field) as InventorySortField;
    const sortDirection = (searchParams.get("sortDirection") ??
      defaultAdminVarietySearchParams.sort
        .direction) as InventoryTableSort["direction"];
    const filters: InventoryTableFilters = {
      category:
        searchParams.get("category") ??
        defaultAdminVarietySearchParams.filters.category,
      query:
        searchParams.get("query") ??
        defaultAdminVarietySearchParams.filters.query,
      stock:
        searchParams.get("stock") ??
        defaultAdminVarietySearchParams.filters.stock,
      visibility:
        (searchParams.get("visibility") as
          | InventoryTableFilters["visibility"]
          | null) ?? defaultAdminVarietySearchParams.filters.visibility,
    };
    const page = parsePositiveInt(
      searchParams.get("page"),
      defaultAdminVarietySearchParams.page,
    );
    const pageSize = clampPageSize(
      parsePositiveInt(
        searchParams.get("pageSize"),
        defaultAdminVarietySearchParams.pageSize,
      ),
      1,
      100,
    );
    const result = await searchAdminVarieties(locals, {
      filters,
      page,
      pageSize,
      sort: {
        direction: sortDirection === "desc" ? "desc" : "asc",
        field: sortField,
      },
    });

    return json(result);
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
