import { useState } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { EditableCell } from "./editable-cell";
import { RowActions } from "./row-actions";
import {
  VARIETY_CATEGORIES,
  categoryLabels,
  STOCK_STATUSES,
  stockLabels,
} from "../../lib/catalog/constants";
import { varietyInputSchema } from "../../lib/catalog/schema";
import type { Variety } from "../../lib/varieties";

interface InventoryTableProps {
  initialVarieties: Variety[];
}

type InventoryRow = Variety & {
  isNew?: boolean;
};

function createDraftRow(): InventoryRow {
  const id = `draft-${crypto.randomUUID()}`;
  return {
    id,
    slug: "",
    name: "",
    sku: "",
    description: "",
    price: 0,
    salePrice: null,
    stock: "available",
    category: "decorative",
    color: ["blush"],
    bloomSize: "",
    height: "",
    imageUrl: "/catalog-seed/placeholder-variety.jpg",
    imageKey: null,
    hidden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isNew: true,
  };
}

function updateRow(
  rows: InventoryRow[],
  rowId: string,
  updater: (row: InventoryRow) => InventoryRow,
) {
  return rows.map((row) => (row.id === rowId ? updater(row) : row));
}

function normalizeColorValue(value: string) {
  return value.trim().toLowerCase();
}

function omitRowSnapshot(rows: Record<string, InventoryRow>, rowIds: string[]) {
  const next = { ...rows };

  for (const rowId of rowIds) {
    delete next[rowId];
  }

  return next;
}

function getColorOptions(rows: InventoryRow[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => row.color)
        .map(normalizeColorValue)
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export default function InventoryTable({
  initialVarieties,
}: InventoryTableProps) {
  const [rows, setRows] = useState<InventoryRow[]>(initialVarieties);
  const [originalRows, setOriginalRows] = useState<
    Record<string, InventoryRow>
  >({});
  const [editingRowIds, setEditingRowIds] = useState<Record<string, boolean>>(
    {},
  );
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colorOptions = getColorOptions(rows).map((color) => ({
    value: color,
    label: color,
  }));

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
    setNotice(`${savedRow.name} saved.`);
  }

  const table = useReactTable({
    data: rows,
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">
            Catalog rows
          </p>
          <p className="text-sm text-stone-500">
            Edit each variety inline. Slugs and SKUs are generated automatically
            when a record is first saved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const draft = createDraftRow();
            setRows((current) => [draft, ...current]);
            beginEdit(draft);
          }}
          className="border border-ink bg-ink px-4 py-3 text-xs uppercase tracking-widest text-white hover:bg-white hover:text-ink transition-colors"
        >
          Add Variety
        </button>
      </div>

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
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Name
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Category
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Stock
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Price
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Sale
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Colors
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Bloom
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Height
                </th>
                <th className="px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Hidden
                </th>
                <th className="w-[20%] px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Description
                </th>
                <th className="w-28 px-2 py-2 text-xs uppercase tracking-widest text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const isEditing = Boolean(editingRowIds[row.original.id]);

                return (
                  <tr
                    key={row.id}
                    className="border-b border-stone-300 align-top last:border-b-0"
                  >
                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label={row.original.name || "Variety image"}
                        value={row.original.imageUrl}
                        type="image"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(
                            row.original.id,
                            "imageUrl",
                            String(value),
                          )
                        }
                        onImageUpload={(file) =>
                          uploadImage(row.original.id, file)
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Name"
                        value={row.original.name}
                        type="text"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(row.original.id, "name", String(value))
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Category"
                        value={row.original.category}
                        type="select"
                        isEditing={isEditing}
                        compact
                        options={VARIETY_CATEGORIES.map((category) => ({
                          value: category,
                          label: categoryLabels[category],
                        }))}
                        onValueChange={(value) =>
                          setRowValue(
                            row.original.id,
                            "category",
                            String(value) as InventoryRow["category"],
                          )
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Stock"
                        value={row.original.stock}
                        type="select"
                        isEditing={isEditing}
                        compact
                        options={STOCK_STATUSES.map((status) => ({
                          value: status,
                          label: stockLabels[status],
                        }))}
                        onValueChange={(value) =>
                          setRowValue(
                            row.original.id,
                            "stock",
                            String(value) as InventoryRow["stock"],
                          )
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Price"
                        value={row.original.price}
                        type="number"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(row.original.id, "price", Number(value))
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Sale price"
                        value={row.original.salePrice ?? ""}
                        type="number"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) => {
                          const nextValue = String(value).trim();
                          setRowValue(
                            row.original.id,
                            "salePrice",
                            nextValue.length > 0 ? Number(nextValue) : null,
                          );
                        }}
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Colors"
                        value={row.original.color}
                        type="multi-combobox"
                        isEditing={isEditing}
                        compact
                        options={colorOptions}
                        onValueChange={(value) =>
                          setRowValue(
                            row.original.id,
                            "color",
                            Array.isArray(value) ? value : [],
                          )
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Bloom size"
                        value={row.original.bloomSize}
                        type="text"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(
                            row.original.id,
                            "bloomSize",
                            String(value),
                          )
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Height"
                        value={row.original.height}
                        type="text"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(row.original.id, "height", String(value))
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      <EditableCell
                        label="Hide page"
                        value={row.original.hidden}
                        type="checkbox"
                        isEditing={isEditing}
                        compact
                        onValueChange={(value) =>
                          setRowValue(row.original.id, "hidden", Boolean(value))
                        }
                      />
                    </td>

                    <td className="px-2 py-2 align-top">
                      {isEditing ? (
                        <EditableCell
                          label="Description"
                          value={row.original.description}
                          type="textarea"
                          isEditing={isEditing}
                          compact
                          onValueChange={(value) =>
                            setRowValue(
                              row.original.id,
                              "description",
                              String(value),
                            )
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          <span className="block text-xs leading-snug text-ink">
                            {row.original.description || "—"}
                          </span>
                          <span className="block text-[11px] uppercase tracking-widest text-stone-500">
                            Updated{" "}
                            {new Date(
                              row.original.updatedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-2 align-top">
                      <div className="flex justify-end">
                        <RowActions
                          isEditing={isEditing}
                          isSaving={savingRowId === row.original.id}
                          onEdit={() => beginEdit(row.original)}
                          onCancel={() => cancelEdit(row.original)}
                          onSave={() => saveRow(row.original)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
