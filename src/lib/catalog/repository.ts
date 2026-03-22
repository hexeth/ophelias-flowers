import { CATALOG_PLACEHOLDER_IMAGE } from "./constants";
import {
  buildPaginatedSearchResult,
  getSearchTerms,
  type AdminVarietySearchParams,
  type InventorySortField,
  type PaginatedSearchResult,
  type PublicVarietySearchParams,
  type VarietySearchSuggestion,
} from "./search";
import type { VarietyInput } from "./schema";
import type { Variety, VarietyRow } from "./types";

function slugifyName(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "variety"
  );
}

function buildSkuPrefix(name: string) {
  const parts = slugifyName(name).split("-").filter(Boolean);

  if (parts.length === 0) {
    return "NEW";
  }

  const joined =
    parts.length === 1
      ? parts[0].slice(0, 3)
      : parts
          .map((part) => part[0])
          .join("")
          .slice(0, 5);

  return joined.toUpperCase().replace(/[^A-Z0-9]/g, "") || "NEW";
}

async function slugExists(db: D1Database, slug: string, excludeId?: string) {
  const query = excludeId
    ? db
        .prepare("SELECT id FROM varieties WHERE slug = ? AND id != ? LIMIT 1")
        .bind(slug, excludeId)
    : db.prepare("SELECT id FROM varieties WHERE slug = ? LIMIT 1").bind(slug);

  return Boolean(await query.first<{ id: string }>());
}

async function skuExists(db: D1Database, sku: string, excludeId?: string) {
  const query = excludeId
    ? db
        .prepare("SELECT id FROM varieties WHERE sku = ? AND id != ? LIMIT 1")
        .bind(sku, excludeId)
    : db.prepare("SELECT id FROM varieties WHERE sku = ? LIMIT 1").bind(sku);

  return Boolean(await query.first<{ id: string }>());
}

async function ensureUniqueSlug(
  db: D1Database,
  name: string,
  excludeId?: string,
) {
  const baseSlug = slugifyName(name);
  let slug = baseSlug;
  let index = 2;

  while (await slugExists(db, slug, excludeId)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

async function ensureUniqueSku(
  db: D1Database,
  name: string,
  excludeId?: string,
) {
  const prefix = buildSkuPrefix(name);
  let sequence = 1;

  while (sequence < 1000) {
    const sku = `DAH-${prefix}-${String(sequence).padStart(3, "0")}`;
    if (!(await skuExists(db, sku, excludeId))) {
      return sku;
    }

    sequence += 1;
  }

  throw new Error("Unable to generate a unique SKU.");
}

function centsToDollars(value: number | null) {
  return value === null ? null : value / 100;
}

function dollarsToCents(value: number | null) {
  return value === null ? null : Math.round(value * 100);
}

function getCatalogImageUrl(imageKey: string | null, imageUrl: string | null) {
  if (imageKey) {
    return `/catalog-images/${imageKey}`;
  }

  return imageUrl ?? CATALOG_PLACEHOLDER_IMAGE;
}

function parseColorJson(colorJson: string) {
  try {
    const parsed = JSON.parse(colorJson) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((color): color is string => typeof color === "string");
  } catch (error) {
    console.error("Invalid color_json value in catalog row", error);
    return [];
  }
}

function rowToVariety(row: VarietyRow): Variety {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    description: row.description,
    price: centsToDollars(row.price_cents) ?? 0,
    salePrice: centsToDollars(row.sale_price_cents),
    stock: row.stock,
    category: row.category,
    color: parseColorJson(row.color_json),
    bloomSize: row.bloom_size,
    height: row.height,
    imageUrl: getCatalogImageUrl(row.image_key, row.image_url),
    imageKey: row.image_key,
    hidden: Boolean(row.hidden),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLikeTerm(term: string) {
  return term
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function buildSearchWhereClause(terms: string[], fields: string[]) {
  const clauses: string[] = [];
  const bindings: string[] = [];

  for (const term of terms) {
    const pattern = `%${escapeLikeTerm(term)}%`;
    clauses.push(
      `(${fields.map((field) => `${field} LIKE ? ESCAPE '\\'`).join(" OR ")})`,
    );
    bindings.push(...fields.map(() => pattern));
  }

  return {
    bindings,
    sql: clauses.join(" AND "),
  };
}

function buildSearchRankClause(
  terms: string[],
  fields: {
    exact: string;
    prefix: string;
    partial: string;
  }[],
) {
  if (terms.length === 0) {
    return {
      bindings: [] as string[],
      sql: "0",
    };
  }

  const bindings: string[] = [];
  const segments = terms.map((term) => {
    const exact = escapeLikeTerm(term);
    const prefix = `${exact}%`;
    const partial = `%${exact}%`;
    const cases = fields.map(
      (
        { exact: exactField, prefix: prefixField, partial: partialField },
        index,
      ) => {
        const baseScore = index * 3;

        bindings.push(term);
        bindings.push(prefix);
        bindings.push(partial);

        return `WHEN ${exactField} = ? THEN ${baseScore} WHEN ${prefixField} LIKE ? ESCAPE '\\' THEN ${baseScore + 1} WHEN ${partialField} LIKE ? ESCAPE '\\' THEN ${baseScore + 2}`;
      },
    );

    return `(CASE ${cases.join(" ")} ELSE 999 END)`;
  });

  return {
    bindings,
    sql: segments.join(" + "),
  };
}

function getPublicSortSql(sort: PublicVarietySearchParams["sort"]) {
  switch (sort) {
    case "name-desc":
      return "name DESC, slug ASC";
    case "price-asc":
      return "COALESCE(sale_price_cents, price_cents) ASC, name ASC";
    case "price-desc":
      return "COALESCE(sale_price_cents, price_cents) DESC, name ASC";
    case "name-asc":
    default:
      return "name ASC, slug ASC";
  }
}

function getAdminSortSql(field: InventorySortField, direction: "asc" | "desc") {
  const column = (() => {
    switch (field) {
      case "category":
        return "category";
      case "stock":
        return "CASE stock WHEN 'available' THEN 0 WHEN 'low' THEN 1 ELSE 2 END";
      case "price":
        return "price_cents";
      case "salePrice":
        return "COALESCE(sale_price_cents, 2147483647)";
      case "color":
        return "color_json";
      case "bloomSize":
        return "bloom_size";
      case "height":
        return "height";
      case "hidden":
        return "hidden";
      case "updatedAt":
        return "updated_at";
      case "name":
      default:
        return "name";
    }
  })();

  const sqlDirection = direction === "desc" ? "DESC" : "ASC";
  return `${column} ${sqlDirection}, name ASC`;
}

async function countVarieties(
  db: D1Database,
  whereClauses: string[],
  bindings: unknown[],
) {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as total FROM varieties WHERE ${whereClauses.join(" AND ")}`,
    )
    .bind(...bindings)
    .first<{ total: number }>();

  return Number(result?.total ?? 0);
}

async function getVarietyById(db: D1Database, id: string) {
  const result = await db
    .prepare("SELECT * FROM varieties WHERE id = ? LIMIT 1")
    .bind(id)
    .first<VarietyRow>();

  return result ? rowToVariety(result) : null;
}

export async function listAdminVarieties(db: D1Database) {
  const result = await db
    .prepare(
      "SELECT * FROM varieties WHERE deleted_at IS NULL ORDER BY updated_at DESC, name ASC",
    )
    .all<VarietyRow>();

  return (result.results ?? []).map(rowToVariety);
}

export async function listPublicVarieties(db: D1Database) {
  const result = await db
    .prepare(
      "SELECT * FROM varieties WHERE hidden = 0 AND deleted_at IS NULL ORDER BY name ASC",
    )
    .all<VarietyRow>();

  return (result.results ?? []).map(rowToVariety);
}

export async function searchPublicVarieties(
  db: D1Database,
  params: PublicVarietySearchParams,
): Promise<PaginatedSearchResult<Variety>> {
  const pageSize = params.pageSize;
  const requestedPage = params.page;
  const terms = getSearchTerms(params.query);
  const whereClauses = ["hidden = 0", "deleted_at IS NULL"];
  const bindings: unknown[] = [];

  if (params.categories.length > 0) {
    whereClauses.push(
      `category IN (${params.categories.map(() => "?").join(", ")})`,
    );
    bindings.push(...params.categories);
  }

  if (params.colors.length > 0) {
    whereClauses.push(
      `(${params.colors.map(() => `lower(color_json) LIKE ? ESCAPE '\\'`).join(" OR ")})`,
    );
    bindings.push(
      ...params.colors.map(
        (color) => `%\"${escapeLikeTerm(color.toLowerCase())}\"%`,
      ),
    );
  }

  if (params.inStockOnly) {
    whereClauses.push("stock != 'sold-out'");
  }

  const searchFields = [
    "lower(name)",
    "lower(sku)",
    "lower(category)",
    "lower(color_json)",
    "lower(description)",
  ];
  const searchClause = buildSearchWhereClause(terms, searchFields);

  if (searchClause.sql) {
    whereClauses.push(searchClause.sql);
    bindings.push(...searchClause.bindings);
  }

  const total = await countVarieties(db, whereClauses, bindings);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const rankClause = buildSearchRankClause(terms, [
    { exact: "lower(name)", prefix: "lower(name)", partial: "lower(name)" },
    { exact: "lower(sku)", prefix: "lower(sku)", partial: "lower(sku)" },
    {
      exact: "lower(category)",
      prefix: "lower(category)",
      partial: "lower(category)",
    },
    {
      exact: "lower(color_json)",
      prefix: "lower(color_json)",
      partial: "lower(color_json)",
    },
    {
      exact: "lower(description)",
      prefix: "lower(description)",
      partial: "lower(description)",
    },
  ]);
  const orderBy =
    terms.length > 0
      ? `search_rank ASC, ${getPublicSortSql(params.sort)}`
      : getPublicSortSql(params.sort);

  const result = await db
    .prepare(
      `
        SELECT *, ${rankClause.sql} AS search_rank
        FROM varieties
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
    )
    .bind(...rankClause.bindings, ...bindings, pageSize, offset)
    .all<VarietyRow>();

  return buildPaginatedSearchResult(
    (result.results ?? []).map(rowToVariety),
    total,
    page,
    pageSize,
  );
}

export async function searchPublicVarietySuggestions(
  db: D1Database,
  query: string,
  limit = 6,
): Promise<VarietySearchSuggestion[]> {
  const terms = getSearchTerms(query);

  if (terms.length === 0) {
    return [];
  }

  const whereClauses = ["hidden = 0", "deleted_at IS NULL"];
  const searchFields = [
    "lower(name)",
    "lower(sku)",
    "lower(category)",
    "lower(color_json)",
    "lower(description)",
  ];
  const searchClause = buildSearchWhereClause(terms, searchFields);
  const rankClause = buildSearchRankClause(terms, [
    { exact: "lower(name)", prefix: "lower(name)", partial: "lower(name)" },
    { exact: "lower(sku)", prefix: "lower(sku)", partial: "lower(sku)" },
    {
      exact: "lower(category)",
      prefix: "lower(category)",
      partial: "lower(category)",
    },
    {
      exact: "lower(color_json)",
      prefix: "lower(color_json)",
      partial: "lower(color_json)",
    },
    {
      exact: "lower(description)",
      prefix: "lower(description)",
      partial: "lower(description)",
    },
  ]);

  if (searchClause.sql) {
    whereClauses.push(searchClause.sql);
  }

  const result = await db
    .prepare(
      `
        SELECT *, ${rankClause.sql} AS search_rank
        FROM varieties
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY search_rank ASC, name ASC, slug ASC
        LIMIT ?
      `,
    )
    .bind(...rankClause.bindings, ...searchClause.bindings, limit)
    .all<VarietyRow>();

  return (result.results ?? []).map((row) => {
    const variety = rowToVariety(row);

    return {
      category: variety.category,
      imageUrl: variety.imageUrl,
      name: variety.name,
      slug: variety.slug,
      sku: variety.sku,
      stock: variety.stock,
    };
  });
}

export async function searchAdminVarieties(
  db: D1Database,
  params: AdminVarietySearchParams,
): Promise<PaginatedSearchResult<Variety>> {
  const pageSize = params.pageSize;
  const requestedPage = params.page;
  const terms = getSearchTerms(params.filters.query);
  const whereClauses = ["deleted_at IS NULL"];
  const bindings: unknown[] = [];

  if (params.filters.category !== "all") {
    whereClauses.push("category = ?");
    bindings.push(params.filters.category);
  }

  if (params.filters.stock !== "all") {
    whereClauses.push("stock = ?");
    bindings.push(params.filters.stock);
  }

  if (params.filters.visibility === "visible") {
    whereClauses.push("hidden = 0");
  }

  if (params.filters.visibility === "hidden") {
    whereClauses.push("hidden = 1");
  }

  const searchFields = [
    "lower(name)",
    "lower(sku)",
    "lower(category)",
    "lower(stock)",
    "lower(color_json)",
    "lower(bloom_size)",
    "lower(height)",
    "lower(description)",
  ];
  const searchClause = buildSearchWhereClause(terms, searchFields);

  if (searchClause.sql) {
    whereClauses.push(searchClause.sql);
    bindings.push(...searchClause.bindings);
  }

  const total = await countVarieties(db, whereClauses, bindings);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const rankClause = buildSearchRankClause(terms, [
    { exact: "lower(name)", prefix: "lower(name)", partial: "lower(name)" },
    { exact: "lower(sku)", prefix: "lower(sku)", partial: "lower(sku)" },
    {
      exact: "lower(category)",
      prefix: "lower(category)",
      partial: "lower(category)",
    },
    { exact: "lower(stock)", prefix: "lower(stock)", partial: "lower(stock)" },
    {
      exact: "lower(color_json)",
      prefix: "lower(color_json)",
      partial: "lower(color_json)",
    },
    {
      exact: "lower(description)",
      prefix: "lower(description)",
      partial: "lower(description)",
    },
  ]);
  const orderBy =
    terms.length > 0
      ? `search_rank ASC, ${getAdminSortSql(params.sort.field, params.sort.direction)}`
      : getAdminSortSql(params.sort.field, params.sort.direction);

  const result = await db
    .prepare(
      `
        SELECT *, ${rankClause.sql} AS search_rank
        FROM varieties
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
    )
    .bind(...rankClause.bindings, ...bindings, pageSize, offset)
    .all<VarietyRow>();

  return buildPaginatedSearchResult(
    (result.results ?? []).map(rowToVariety),
    total,
    page,
    pageSize,
  );
}

export async function getPublicVarietyBySlug(db: D1Database, slug: string) {
  const result = await db
    .prepare(
      "SELECT * FROM varieties WHERE slug = ? AND hidden = 0 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(slug)
    .first<VarietyRow>();

  return result ? rowToVariety(result) : null;
}

export async function upsertVariety(db: D1Database, input: VarietyInput) {
  const now = new Date().toISOString();
  const existing = input.id ? await getVarietyById(db, input.id) : null;
  const id = existing?.id ?? input.id ?? crypto.randomUUID();
  const createdAt = existing?.createdAt ?? now;
  const slug =
    existing?.slug ??
    input.slug ??
    (await ensureUniqueSlug(db, input.name, existing?.id));
  const sku =
    existing?.sku ??
    input.sku ??
    (await ensureUniqueSku(db, input.name, existing?.id));
  const normalizedImageUrl = getCatalogImageUrl(input.imageKey, input.imageUrl);

  const statement = existing
    ? db
        .prepare(
          `
        UPDATE varieties
        SET slug = ?,
            name = ?,
            sku = ?,
            description = ?,
            price_cents = ?,
            sale_price_cents = ?,
            stock = ?,
            category = ?,
            color_json = ?,
            bloom_size = ?,
            height = ?,
            image_url = ?,
            image_key = ?,
            hidden = ?,
            updated_at = ?
        WHERE id = ?
      `,
        )
        .bind(
          slug,
          input.name,
          sku,
          input.description,
          dollarsToCents(input.price),
          dollarsToCents(input.salePrice),
          input.stock,
          input.category,
          JSON.stringify(input.color),
          input.bloomSize,
          input.height,
          normalizedImageUrl,
          input.imageKey,
          input.hidden ? 1 : 0,
          now,
          id,
        )
    : db
        .prepare(
          `
        INSERT INTO varieties (
          id,
          slug,
          name,
          sku,
          description,
          price_cents,
          sale_price_cents,
          stock,
          category,
          color_json,
          bloom_size,
          height,
          image_url,
          image_key,
          hidden,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .bind(
          id,
          slug,
          input.name,
          sku,
          input.description,
          dollarsToCents(input.price),
          dollarsToCents(input.salePrice),
          input.stock,
          input.category,
          JSON.stringify(input.color),
          input.bloomSize,
          input.height,
          normalizedImageUrl,
          input.imageKey,
          input.hidden ? 1 : 0,
          createdAt,
          now,
        );

  await statement.run();

  const saved = await getVarietyById(db, id);
  if (!saved) {
    throw new Error("Failed to load saved variety.");
  }

  return saved;
}

export async function softDeleteVariety(db: D1Database, id: string) {
  const existing = await db
    .prepare(
      "SELECT name FROM varieties WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(id)
    .first<{ name: string }>();

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  await db
    .prepare(
      `
        UPDATE varieties
        SET deleted_at = ?,
            updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(now, now, id)
    .run();

  return {
    id,
    name: existing.name,
    deletedAt: now,
  };
}
