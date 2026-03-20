import type { Variety } from "./types";

export type InventoryRow = Variety & {
  isNew?: boolean;
};

export type InventorySortField =
  | "name"
  | "category"
  | "stock"
  | "price"
  | "salePrice"
  | "color"
  | "bloomSize"
  | "height"
  | "hidden"
  | "updatedAt";

export interface InventoryTableFilters {
  category: string;
  stock: string;
  visibility: "all" | "visible" | "hidden";
  query: string;
}

export interface InventoryTableSort {
  direction: "asc" | "desc";
  field: InventorySortField;
}

export type InventoryEditingRowMap = Record<string, boolean>;
export type InventoryOriginalRowMap = Record<string, InventoryRow>;

const stockSortOrder = {
  available: 0,
  low: 1,
  "sold-out": 2,
} as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function compareNumbers(left: number, right: number) {
  return left - right;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function scoreFuzzyTerm(text: string, term: string) {
  if (!term) {
    return 0;
  }

  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return 0;
  }

  const substringIndex = normalizedText.indexOf(normalizedTerm);
  if (substringIndex !== -1) {
    return substringIndex;
  }

  let score = 100;
  let searchFrom = 0;

  for (const character of normalizedTerm) {
    const matchIndex = normalizedText.indexOf(character, searchFrom);
    if (matchIndex === -1) {
      return null;
    }

    score += matchIndex - searchFrom;
    searchFrom = matchIndex + 1;
  }

  return score;
}

function getSearchCandidates(row: InventoryRow) {
  return [
    row.name,
    row.sku,
    row.category,
    row.stock,
    row.color.join(" "),
    row.bloomSize,
    row.height,
    row.description,
  ].map(normalizeText);
}

export function getInventoryRowSearchScore(row: InventoryRow, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const searchableValues = getSearchCandidates(row);

  let totalScore = 0;

  for (const term of terms) {
    let bestScore: number | null = null;

    for (const value of searchableValues) {
      const score = scoreFuzzyTerm(value, term);
      if (score === null) {
        continue;
      }

      if (bestScore === null || score < bestScore) {
        bestScore = score;
      }
    }

    if (bestScore === null) {
      return null;
    }

    totalScore += bestScore;
  }

  return totalScore;
}

function matchesInventoryFilters(
  row: InventoryRow,
  filters: InventoryTableFilters,
) {
  if (filters.category !== "all" && row.category !== filters.category) {
    return false;
  }

  if (filters.stock !== "all" && row.stock !== filters.stock) {
    return false;
  }

  if (filters.visibility === "visible" && row.hidden) {
    return false;
  }

  if (filters.visibility === "hidden" && !row.hidden) {
    return false;
  }

  return true;
}

function compareRowsBySort(
  left: InventoryRow,
  right: InventoryRow,
  sort: InventoryTableSort,
) {
  switch (sort.field) {
    case "category":
      return compareStrings(left.category, right.category);
    case "stock":
      return compareNumbers(
        stockSortOrder[left.stock],
        stockSortOrder[right.stock],
      );
    case "price":
      return compareNumbers(left.price, right.price);
    case "salePrice":
      return compareNumbers(
        left.salePrice ?? Number.POSITIVE_INFINITY,
        right.salePrice ?? Number.POSITIVE_INFINITY,
      );
    case "color":
      return compareStrings(left.color.join(", "), right.color.join(", "));
    case "bloomSize":
      return compareStrings(left.bloomSize, right.bloomSize);
    case "height":
      return compareStrings(left.height, right.height);
    case "hidden":
      return compareNumbers(Number(left.hidden), Number(right.hidden));
    case "updatedAt":
      return compareNumbers(
        Date.parse(left.updatedAt),
        Date.parse(right.updatedAt),
      );
    case "name":
    default:
      return compareStrings(left.name, right.name);
  }
}

export function applyInventoryTableControls(
  rows: InventoryRow[],
  filters: InventoryTableFilters,
  sort: InventoryTableSort,
) {
  const normalizedQuery = normalizeText(filters.query);

  return rows
    .map((row) => ({
      row,
      searchScore: getInventoryRowSearchScore(row, normalizedQuery),
    }))
    .filter(({ row, searchScore }) => {
      if (!matchesInventoryFilters(row, filters)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return searchScore !== null;
    })
    .sort((left, right) => {
      if (normalizedQuery && left.searchScore !== right.searchScore) {
        return (
          (left.searchScore ?? Number.POSITIVE_INFINITY) -
          (right.searchScore ?? Number.POSITIVE_INFINITY)
        );
      }

      const sorted = compareRowsBySort(left.row, right.row, sort);
      if (sorted !== 0) {
        return sort.direction === "asc" ? sorted : -sorted;
      }

      return compareStrings(left.row.name, right.row.name);
    })
    .map(({ row }) => row);
}

export function getVisibleInventoryRows(
  rows: InventoryRow[],
  filters: InventoryTableFilters,
  sort: InventoryTableSort,
  editingRowIds: InventoryEditingRowMap,
  originalRows: InventoryOriginalRowMap,
) {
  const pinnedDraftRows = rows.filter(
    (row) => row.isNew && editingRowIds[row.id] === true,
  );
  const pinnedDraftRowIds = new Set(pinnedDraftRows.map((row) => row.id));
  const latestRowsById = new Map(rows.map((row) => [row.id, row]));

  const sortableRows = rows
    .filter((row) => !pinnedDraftRowIds.has(row.id))
    .map((row) => {
      if (editingRowIds[row.id] && originalRows[row.id]) {
        return originalRows[row.id];
      }

      return row;
    });

  return [
    ...pinnedDraftRows,
    ...applyInventoryTableControls(sortableRows, filters, sort).map(
      (row) => latestRowsById.get(row.id) ?? row,
    ),
  ];
}
