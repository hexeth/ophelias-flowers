import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..", "..");
export const legacyVarietiesDir = path.join(
  rootDir,
  "src",
  "content",
  "varieties",
);
export const legacyImagesDir = path.join(rootDir, "src", "assets", "varieties");
export const publicCatalogSeedDir = path.join(
  rootDir,
  "public",
  "catalog-seed",
);
export const seedOutputDir = path.join(rootDir, "db", "seeds");
export const defaultSeedOutputFile = path.join(
  seedOutputDir,
  "0001_seed_varieties.sql",
);
export const catalogMigrationsDir = path.join(rootDir, "db", "migrations");

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function joinUrl(baseUrl, suffix) {
  if (!baseUrl || baseUrl === "/") {
    return `/${trimSlashes(suffix)}`;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${trimSlashes(suffix)}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function getImageFileName(frontmatterImage) {
  if (typeof frontmatterImage !== "string" || frontmatterImage.length === 0) {
    return "placeholder-variety.jpg";
  }

  return path.basename(frontmatterImage);
}

function buildImageReference(frontmatterImage, options) {
  const fileName = getImageFileName(frontmatterImage);
  const imageKeyPrefix = trimSlashes(options.imageKeyPrefix ?? "");
  const imageKey = imageKeyPrefix ? `${imageKeyPrefix}/${fileName}` : null;
  const imagePath = imageKey ?? fileName;

  return {
    fileName,
    imageKey,
    imageUrl: joinUrl(options.imageBaseUrl ?? "/catalog-seed", imagePath),
  };
}

export async function listLegacyImageFiles() {
  const entries = await readdir(legacyImagesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

export async function listCatalogMigrationFiles() {
  const entries = await readdir(catalogMigrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(catalogMigrationsDir, entry.name))
    .sort();
}

export async function syncLegacyImagesToPublic() {
  await mkdir(publicCatalogSeedDir, { recursive: true });

  const fileNames = await listLegacyImageFiles();
  await Promise.all(
    fileNames.map((fileName) =>
      cp(
        path.join(legacyImagesDir, fileName),
        path.join(publicCatalogSeedDir, fileName),
      ),
    ),
  );

  return {
    fileCount: fileNames.length,
    targetDir: publicCatalogSeedDir,
  };
}

export async function loadLegacyVarieties(options = {}) {
  const entries = (await readdir(legacyVarietiesDir))
    .filter((entry) => entry.endsWith(".md"))
    .sort();
  const now = options.timestamp ?? new Date().toISOString();
  const varieties = [];

  for (const entry of entries) {
    const fullPath = path.join(legacyVarietiesDir, entry);
    const markdown = await readFile(fullPath, "utf8");
    const { data, content } = matter(markdown);
    const slug = entry.replace(/\.md$/, "");
    const image = buildImageReference(data.image, options);

    varieties.push({
      id: crypto.randomUUID(),
      slug,
      name: data.name ?? slug,
      sku: data.sku ?? slug.toUpperCase(),
      description: content.trim(),
      priceCents: Math.round(Number(data.price ?? 0) * 100),
      salePriceCents: null,
      stock: data.stock ?? "available",
      category: data.category ?? "decorative",
      colorJson: JSON.stringify(Array.isArray(data.color) ? data.color : []),
      bloomSize: data.bloomSize ?? "",
      height: data.height ?? "",
      imageUrl: image.imageUrl,
      imageKey: image.imageKey,
      hidden: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return varieties;
}

export function buildSeedSql(varieties) {
  return `${varieties
    .map(
      (variety) => `INSERT INTO varieties (
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
) VALUES (
  ${sqlString(variety.id)},
  ${sqlString(variety.slug)},
  ${sqlString(variety.name)},
  ${sqlString(variety.sku)},
  ${sqlString(variety.description)},
  ${variety.priceCents},
  ${variety.salePriceCents === null ? "NULL" : variety.salePriceCents},
  ${sqlString(variety.stock)},
  ${sqlString(variety.category)},
  ${sqlString(variety.colorJson)},
  ${sqlString(variety.bloomSize)},
  ${sqlString(variety.height)},
  ${sqlString(variety.imageUrl)},
  ${variety.imageKey === null ? "NULL" : sqlString(variety.imageKey)},
  ${variety.hidden},
  ${sqlString(variety.createdAt)},
  ${sqlString(variety.updatedAt)}
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sku = excluded.sku,
  description = excluded.description,
  price_cents = excluded.price_cents,
  sale_price_cents = excluded.sale_price_cents,
  stock = excluded.stock,
  category = excluded.category,
  color_json = excluded.color_json,
  bloom_size = excluded.bloom_size,
  height = excluded.height,
  image_url = excluded.image_url,
  image_key = excluded.image_key,
  hidden = excluded.hidden,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;`,
    )
    .join("\n\n")}\n`;
}

export async function writeSeedSql(options = {}) {
  const outputFile = options.outputFile ?? defaultSeedOutputFile;
  const varieties = await loadLegacyVarieties(options);
  const sql = buildSeedSql(varieties);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, sql, "utf8");

  return {
    varieties,
    outputFile,
  };
}

export async function readWranglerCatalogConfig() {
  const wranglerConfig = await readFile(
    path.join(rootDir, "wrangler.toml"),
    "utf8",
  );
  const databaseNameMatch = wranglerConfig.match(
    /\[\[d1_databases\]\][\s\S]*?database_name\s*=\s*"([^"]+)"/,
  );
  const databaseIdMatch = wranglerConfig.match(
    /\[\[d1_databases\]\][\s\S]*?database_id\s*=\s*"([^"]+)"/,
  );
  const bucketNameMatch = wranglerConfig.match(
    /\[\[r2_buckets\]\][\s\S]*?bucket_name\s*=\s*"([^"]+)"/,
  );
  const imageBaseUrlMatch = wranglerConfig.match(
    /CATALOG_IMAGE_PUBLIC_BASE_URL\s*=\s*"([^"]+)"/,
  );

  return {
    databaseName: databaseNameMatch?.[1] ?? null,
    databaseId: databaseIdMatch?.[1] ?? null,
    bucketName: bucketNameMatch?.[1] ?? null,
    imageBaseUrl: imageBaseUrlMatch?.[1] ?? null,
  };
}

export async function createWranglerConfigWithoutD1() {
  const originalConfigPath = path.join(rootDir, "wrangler.toml");
  const originalConfig = await readFile(originalConfigPath, "utf8");
  const sanitizedConfig = originalConfig.replace(
    /\n\[\[d1_databases\]\][\s\S]*?(?=\n\[\[|\n\[|$)/,
    "\n",
  );

  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "ophelias-flowers-wrangler-"),
  );
  const configPath = path.join(tempDir, "wrangler.toml");

  await writeFile(configPath, sanitizedConfig, "utf8");

  return {
    configPath,
    async cleanup() {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}
