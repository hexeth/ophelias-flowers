import {
  getPublicVarietyBySlug as getPublicVarietyBySlugFromDb,
  listAdminVarieties as listAdminVarietiesFromDb,
  listPublicVarieties as listPublicVarietiesFromDb,
  searchAdminVarieties as searchAdminVarietiesFromDb,
  searchPublicVarietySuggestions as searchPublicVarietySuggestionsFromDb,
  searchPublicVarieties as searchPublicVarietiesFromDb,
  softDeleteVariety,
  upsertVariety,
} from "./catalog/repository";
import {
  categoryLabels,
  stockClasses,
  stockDetailLabels,
  stockLabels,
} from "./catalog/constants";
import { parseVarietyInput } from "./catalog/schema";
import type {
  AdminVarietySearchParams,
  PaginatedSearchResult,
  PublicVarietySearchParams,
  VarietySearchSuggestion,
} from "./catalog/search";
import type { Variety } from "./catalog/types";

function getCatalogDb(locals: App.Locals) {
  const db = locals.runtime.env.CATALOG_DB;

  if (!db) {
    throw new Error("CATALOG_DB binding is not configured.");
  }

  return db;
}

export type { Variety } from "./catalog/types";
export { categoryLabels, stockClasses, stockDetailLabels, stockLabels };
export type {
  AdminVarietySearchParams,
  PaginatedSearchResult,
  PublicVarietySearchParams,
  VarietySearchSuggestion,
} from "./catalog/search";

export function getDisplayPrice(variety: Variety) {
  return variety.salePrice ?? variety.price;
}

export async function listPublicVarieties(locals: App.Locals) {
  return listPublicVarietiesFromDb(getCatalogDb(locals));
}

export async function listAdminVarieties(locals: App.Locals) {
  return listAdminVarietiesFromDb(getCatalogDb(locals));
}

export async function searchPublicVarieties(
  locals: App.Locals,
  params: PublicVarietySearchParams,
): Promise<PaginatedSearchResult<Variety>> {
  return searchPublicVarietiesFromDb(getCatalogDb(locals), params);
}

export async function searchPublicVarietySuggestions(
  locals: App.Locals,
  query: string,
  limit?: number,
): Promise<VarietySearchSuggestion[]> {
  return searchPublicVarietySuggestionsFromDb(
    getCatalogDb(locals),
    query,
    limit,
  );
}

export async function searchAdminVarieties(
  locals: App.Locals,
  params: AdminVarietySearchParams,
): Promise<PaginatedSearchResult<Variety>> {
  return searchAdminVarietiesFromDb(getCatalogDb(locals), params);
}

export async function getPublicVarietyBySlug(locals: App.Locals, slug: string) {
  return getPublicVarietyBySlugFromDb(getCatalogDb(locals), slug);
}

export async function saveVariety(locals: App.Locals, payload: unknown) {
  const input = parseVarietyInput(payload);
  return upsertVariety(getCatalogDb(locals), input);
}

export async function deleteVariety(locals: App.Locals, id: string) {
  return softDeleteVariety(getCatalogDb(locals), id);
}

export function getCatalogImageBaseUrl(locals: App.Locals) {
  return locals.runtime.env.CATALOG_IMAGE_PUBLIC_BASE_URL;
}
