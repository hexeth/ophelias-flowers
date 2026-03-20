import { CATALOG_PLACEHOLDER_IMAGE } from "./constants";
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

async function getVarietyById(db: D1Database, id: string) {
  const result = await db
    .prepare("SELECT * FROM varieties WHERE id = ? LIMIT 1")
    .bind(id)
    .first<VarietyRow>();

  return result ? rowToVariety(result) : null;
}

export async function listAdminVarieties(db: D1Database) {
  const result = await db
    .prepare("SELECT * FROM varieties ORDER BY updated_at DESC, name ASC")
    .all<VarietyRow>();

  return (result.results ?? []).map(rowToVariety);
}

export async function listPublicVarieties(db: D1Database) {
  const result = await db
    .prepare("SELECT * FROM varieties WHERE hidden = 0 ORDER BY name ASC")
    .all<VarietyRow>();

  return (result.results ?? []).map(rowToVariety);
}

export async function getPublicVarietyBySlug(db: D1Database, slug: string) {
  const result = await db
    .prepare("SELECT * FROM varieties WHERE slug = ? AND hidden = 0 LIMIT 1")
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
