import type { APIRoute } from "astro";
import { searchPublicVarietySuggestions } from "../../../lib/varieties";

export const prerender = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "content-type": "application/json",
    },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return json({ suggestions: [] });
  }

  try {
    const suggestions = await searchPublicVarietySuggestions(locals, query, 6);
    return json({ suggestions });
  } catch (error) {
    console.error("Unable to load variety suggestions", error);
    return json({ error: "Unable to load suggestions right now." }, 500);
  }
};
