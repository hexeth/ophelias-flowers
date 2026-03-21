export interface CatalogImageVariantOptions {
  width?: number;
  quality?: number;
  fit?: "cover" | "contain" | "scale-down";
  format?: "auto" | "avif" | "webp" | "jpeg" | "png";
}

const CATALOG_IMAGE_PREFIX = "/catalog-images/";

function clampInteger(value: number, min: number, max: number) {
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
}

export function isCatalogImagePath(url: string) {
  return url.startsWith(CATALOG_IMAGE_PREFIX);
}

export function buildCatalogImageUrl(
  url: string,
  options: CatalogImageVariantOptions = {},
) {
  if (!isCatalogImagePath(url)) {
    return url;
  }

  const [path, rawQuery] = url.split("?", 2);
  const searchParams = new URLSearchParams(rawQuery ?? "");

  if (typeof options.width === "number") {
    searchParams.set("w", String(clampInteger(options.width, 64, 2400)));
  }

  if (typeof options.quality === "number") {
    searchParams.set("q", String(clampInteger(options.quality, 30, 95)));
  }

  if (options.fit) {
    searchParams.set("fit", options.fit);
  }

  if (options.format) {
    searchParams.set("format", options.format);
  }

  const nextQuery = searchParams.toString();
  return nextQuery.length > 0 ? `${path}?${nextQuery}` : path;
}

export function buildCatalogImageSrcSet(
  url: string,
  widths: number[],
  options: Omit<CatalogImageVariantOptions, "width"> = {},
) {
  if (!isCatalogImagePath(url)) {
    return undefined;
  }

  const candidates = widths
    .map((width) => clampInteger(width, 64, 2400))
    .filter((width, index, arr) => arr.indexOf(width) === index)
    .sort((a, b) => a - b)
    .map(
      (width) =>
        `${buildCatalogImageUrl(url, { ...options, width })} ${width}w`,
    );

  return candidates.length > 0 ? candidates.join(", ") : undefined;
}
