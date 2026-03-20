export const VARIETY_CATEGORIES = [
  "dinnerplate",
  "ball",
  "pompon",
  "cactus",
  "decorative",
  "waterlily",
  "collarette",
  "anemone",
  "stellar",
  "single",
] as const;

export const STOCK_STATUSES = ["available", "low", "sold-out"] as const;

export const categoryLabels: Record<
  (typeof VARIETY_CATEGORIES)[number],
  string
> = {
  dinnerplate: "Dinnerplate",
  ball: "Ball",
  pompon: "Pompon",
  cactus: "Cactus",
  decorative: "Decorative",
  waterlily: "Waterlily",
  collarette: "Collarette",
  anemone: "Anemone",
  stellar: "Stellar",
  single: "Single",
};

export const stockLabels: Record<(typeof STOCK_STATUSES)[number], string> = {
  available: "In Stock",
  low: "Low Stock",
  "sold-out": "Sold Out",
};

export const stockDetailLabels: Record<
  (typeof STOCK_STATUSES)[number],
  string
> = {
  available: "In Stock",
  low: "Low Stock — order soon",
  "sold-out": "Sold Out",
};

export const stockClasses: Record<(typeof STOCK_STATUSES)[number], string> = {
  available: "text-botanical",
  low: "text-dahlia-wine",
  "sold-out": "text-stone-300 line-through",
};

export const CATALOG_PLACEHOLDER_IMAGE =
  "/catalog-seed/placeholder-variety.jpg";
