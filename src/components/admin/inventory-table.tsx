import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { InventoryDeleteDialog } from "./inventory-delete-dialog";
import { InventoryTableFiltersPanel } from "./inventory-table-filters";
import { InventoryTablePagination } from "./inventory-table-pagination";
import { InventoryTableRow } from "./inventory-table-row";
import {
  createDraftRow,
  getColorOptions,
  omitRowSnapshot,
  updateRow,
} from "./inventory-table-state";
import {
  getVisibleInventoryRows,
  type InventoryRow,
} from "../../lib/catalog/admin-inventory-table";
import {
  defaultInventoryTableFilters,
  type InventorySortField,
  type InventoryTableFilters,
  type InventoryTableSort,
} from "../../lib/catalog/search";
import { varietyInputSchema } from "../../lib/catalog/schema";
import type { Variety } from "../../lib/varieties";

interface InventoryTableProps {
  initialPage?: number;
  initialPageSize?: number;
  initialTotalCount?: number;
  initialVarieties: Variety[];
}

const sortableHeaders: Array<{
  field: InventorySortField;
  label: string;
}> = [
  { field: "name", label: "Name" },
  { field: "category", label: "Category" },
  { field: "stock", label: "Stock" },
  { field: "price", label: "Price" },
  { field: "salePrice", label: "Sale" },
  { field: "color", label: "Colors" },
  { field: "bloomSize", label: "Bloom" },
  { field: "height", label: "Height" },
  { field: "hidden", label: "Hidden" },
];

function SortIcon(props: {
  active: boolean;
  direction: InventoryTableSort["direction"];
}) {
  const { active, direction } = props;
  const activeUp = active && direction === "asc";
  const activeDown = active && direction === "desc";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M3.25 4.5 6 1.75 8.75 4.5"
        className={activeUp ? "text-ink" : "text-stone-300"}
      />
      <path
        d="M3.25 7.5 6 10.25 8.75 7.5"
        className={activeDown ? "text-ink" : "text-stone-300"}
      />
    </svg>
  );
}

export default function InventoryTable({
  initialPage = 1,
  initialPageSize = 25,
  initialVarieties,
}: InventoryTableProps) {
  const [rows, setRows] = useState<InventoryRow[]>(initialVarieties);
  const [filters, setFilters] = useState<InventoryTableFilters>(
    defaultInventoryTableFilters,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<InventoryTableSort>({
    direction: "asc",
    field: "name",
  });
  const [page, setPage] = useState(initialPage);
  const [originalRows, setOriginalRows] = useState<
    Record<string, InventoryRow>
  >({});
  const [editingRowIds, setEditingRowIds] = useState<Record<string, boolean>>(
    {},
  );
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<InventoryRow | null>(
    null,
  );
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [knownColors, setKnownColors] = useState<string[]>(() =>
    getColorOptions(initialVarieties),
  );
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const colorOptions = useMemo(
    () =>
      knownColors.map((color) => ({
        value: color,
        label: color,
      })),
    [knownColors],
  );
  const activeFilters = useMemo(
    () => ({
      ...filters,
      query: deferredSearchQuery,
    }),
    [deferredSearchQuery, filters],
  );
  const visibleRows = useMemo(
    () =>
      getVisibleInventoryRows(
        rows,
        activeFilters,
        sort,
        editingRowIds,
        originalRows,
      ),
    [activeFilters, editingRowIds, originalRows, rows, sort],
  );
  const isFiltering = searchQuery !== deferredSearchQuery;
  const totalCount = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / initialPageSize));
  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * initialPageSize;

    return visibleRows.slice(startIndex, startIndex + initialPageSize);
  }, [initialPageSize, page, visibleRows]);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * initialPageSize + 1;
  const rangeEnd =
    totalCount === 0
      ? 0
      : Math.min(rangeStart + paginatedRows.length - 1, totalCount);

  useEffect(() => {
    const dialog = deleteDialogRef.current;

    if (!dialog) {
      return;
    }

    if (confirmDeleteRow) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [confirmDeleteRow]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function setFilter<K extends Exclude<keyof InventoryTableFilters, "query">>(
    key: K,
    value: InventoryTableFilters[K],
  ) {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleSort(field: InventorySortField) {
    setPage(1);
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function getSortIndicator(field: InventorySortField) {
    if (sort.field !== field) {
      return "Sort";
    }

    return sort.direction === "asc" ? "Ascending" : "Descending";
  }

  function beginEdit(row: InventoryRow) {
    setOriginalRows((current) => ({ ...current, [row.id]: row }));
    setEditingRowIds((current) => ({ ...current, [row.id]: true }));
    setNotice(null);
    setError(null);
  }

  function cancelEdit(row: InventoryRow) {
    setError(null);
    setNotice(null);

    if (row.isNew) {
      setRows((current) => current.filter((item) => item.id !== row.id));
    } else {
      const original = originalRows[row.id];
      if (original) {
        setRows((current) => updateRow(current, row.id, () => original));
      }
    }

    setEditingRowIds((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setOriginalRows((current) => omitRowSnapshot(current, [row.id]));
  }

  function setRowValue<K extends keyof InventoryRow>(
    rowId: string,
    field: K,
    value: InventoryRow[K],
  ) {
    setRows((current) =>
      updateRow(current, rowId, (row) => ({
        ...row,
        [field]: value,
      })),
    );
  }

  async function uploadImage(rowId: string, file: File) {
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/variety-image", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      imageKey?: string;
      imageUrl?: string;
    };
    if (!response.ok || !payload.imageUrl) {
      setError(payload.error ?? "Image upload failed.");
      return;
    }

    setRows((current) =>
      updateRow(current, rowId, (row) => ({
        ...row,
        imageKey: payload.imageKey ?? null,
        imageUrl: payload.imageUrl ?? row.imageUrl,
      })),
    );
  }

  async function saveRow(row: InventoryRow) {
    setSavingRowId(row.id);
    setError(null);
    setNotice(null);

    const payload = {
      ...(row.isNew ? {} : { id: row.id }),
      name: row.name,
      description: row.description,
      price: row.price,
      salePrice: row.salePrice,
      stock: row.stock,
      category: row.category,
      color: row.color,
      bloomSize: row.bloomSize,
      height: row.height,
      imageUrl: row.imageUrl,
      imageKey: row.imageKey,
      hidden: row.hidden,
    };

    const validation = varietyInputSchema.safeParse(payload);
    if (!validation.success) {
      setSavingRowId(null);
      setError(
        validation.error.issues[0]?.message ??
          "Please fix the row before saving.",
      );
      return;
    }

    const response = await fetch("/api/admin/varieties", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(validation.data),
    });

    const result = (await response.json()) as {
      error?: string;
      variety?: Variety;
    };
    setSavingRowId(null);

    if (!response.ok || !result.variety) {
      setError(result.error ?? "Unable to save variety.");
      return;
    }

    const savedRow: InventoryRow = {
      ...result.variety,
      isNew: false,
    };

    setRows((current) =>
      current.map((item) => (item.id === row.id ? savedRow : item)),
    );
    setEditingRowIds((current) => {
      const next = { ...current };
      delete next[row.id];
      delete next[savedRow.id];
      return next;
    });
    setOriginalRows((current) =>
      omitRowSnapshot(current, [row.id, savedRow.id]),
    );
    setKnownColors((current) => {
      const colorSet = new Set(current);
      for (const color of savedRow.color) {
        colorSet.add(color.trim().toLowerCase());
      }
      return Array.from(colorSet).sort((left, right) =>
        left.localeCompare(right),
      );
    });
    setNotice(`${savedRow.name} saved.`);
  }

  function requestDeleteRow(row: InventoryRow) {
    setConfirmDeleteRow(row);
    setError(null);
    setNotice(null);
  }

  function closeDeleteDialog() {
    setConfirmDeleteRow(null);
  }

  async function deleteRow(row: InventoryRow) {
    setDeletingRowId(row.id);
    setError(null);
    setNotice(null);

    const response = await fetch(
      `/api/admin/varieties?id=${encodeURIComponent(row.id)}`,
      {
        method: "DELETE",
      },
    );

    const result = (await response.json()) as {
      error?: string;
      variety?: { id: string; name: string };
    };
    setDeletingRowId(null);
    setConfirmDeleteRow((current) => (current?.id === row.id ? null : current));

    if (!response.ok || !result.variety) {
      setError(result.error ?? "Unable to delete variety.");
      return;
    }

    setRows((current) => current.filter((item) => item.id !== row.id));
    setEditingRowIds((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setOriginalRows((current) => omitRowSnapshot(current, [row.id]));
    setNotice(`${result.variety.name} deleted.`);
  }

  const table = useReactTable<InventoryRow>({
    data: paginatedRows,
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-6">
      <InventoryTableFiltersPanel
        filters={filters}
        isFiltering={isFiltering}
        isLoading={false}
        onAddVariety={() => {
          const draft = createDraftRow();
          setRows((current) => [draft, ...current]);
          setFilters(defaultInventoryTableFilters);
          setSearchQuery("");
          setPage(1);
          beginEdit(draft);
        }}
        onFilterChange={setFilter}
        onSearchQueryChange={(value) => {
          setPage(1);
          setSearchQuery(value);
        }}
        page={page}
        rangeEnd={rangeEnd}
        rangeStart={rangeStart}
        searchQuery={searchQuery}
        totalCount={totalCount}
      />

      {error ? (
        <p className="border border-dahlia-wine px-4 py-3 text-sm text-dahlia-wine">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="border border-botanical px-4 py-3 text-sm text-botanical">
          {notice}
        </p>
      ) : null}

      <div className="border border-ink bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink bg-cream text-left">
                <th className="w-20 px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Image
                </th>
                {sortableHeaders.map((header) => (
                  <th
                    key={header.field}
                    className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(header.field)}
                      className="inline-flex items-center gap-2 text-left transition-colors hover:text-ink"
                      aria-label={`${header.label}: ${getSortIndicator(header.field)}`}
                      title={getSortIndicator(header.field)}
                    >
                      <span>{header.label}</span>
                      <SortIcon
                        active={sort.field === header.field}
                        direction={sort.direction}
                      />
                    </button>
                  </th>
                ))}
                <th className="w-[20%] px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Description
                </th>
                <th className="w-28 px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((tableRow) => {
                const row = tableRow.original;
                const isEditing = Boolean(editingRowIds[row.id]);

                return (
                  <InventoryTableRow
                    key={tableRow.id}
                    row={row}
                    colorOptions={colorOptions}
                    isDeleting={deletingRowId === row.id}
                    isEditing={isEditing}
                    isSaving={savingRowId === row.id}
                    onCancel={() => cancelEdit(row)}
                    onDelete={() => requestDeleteRow(row)}
                    onEdit={() => beginEdit(row)}
                    onImageUpload={(file) => uploadImage(row.id, file)}
                    onSave={() => saveRow(row)}
                    onValueChange={(field, value) =>
                      setRowValue(row.id, field, value)
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InventoryTablePagination
        onNextPage={() =>
          setPage((current) => Math.min(current + 1, totalPages))
        }
        onPreviousPage={() => setPage((current) => Math.max(current - 1, 1))}
        page={page}
        rangeEnd={rangeEnd}
        rangeStart={rangeStart}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      <InventoryDeleteDialog
        confirmDeleteRow={confirmDeleteRow}
        deleteDialogRef={deleteDialogRef}
        deletingRowId={deletingRowId}
        onClose={closeDeleteDialog}
        onConfirmDelete={() => {
          if (confirmDeleteRow) {
            void deleteRow(confirmDeleteRow);
          }
        }}
      />
    </section>
  );
}
