import React from "react";
import { EditableCell } from "./editable-cell";
import { RowActions } from "./row-actions";
import {
  VARIETY_CATEGORIES,
  categoryLabels,
  STOCK_STATUSES,
  stockLabels,
} from "../../lib/catalog/constants";
import type { InventoryRow } from "../../lib/catalog/admin-inventory-table";

const adminDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
});

function formatAdminDate(dateString: string) {
  const parsed = new Date(dateString);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return adminDateFormatter.format(parsed);
}

interface InventoryTableRowProps {
  colorOptions: Array<{ label: string; value: string }>;
  isDeleting: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onImageUpload: (file: File) => Promise<void>;
  onSave: () => void;
  onValueChange: <K extends keyof InventoryRow>(
    field: K,
    value: InventoryRow[K],
  ) => void;
  row: InventoryRow;
}

export function InventoryTableRow(props: InventoryTableRowProps) {
  const {
    colorOptions,
    isDeleting,
    isEditing,
    isSaving,
    onCancel,
    onDelete,
    onEdit,
    onImageUpload,
    onSave,
    onValueChange,
    row,
  } = props;

  return (
    <tr className="border-b border-stone-300 align-top last:border-b-0">
      <td className="px-2 py-2 align-top">
        <EditableCell
          label={row.name || "Variety image"}
          value={row.imageUrl}
          type="image"
          isEditing={isEditing}
          compact
          onValueChange={(value) => onValueChange("imageUrl", String(value))}
          onImageUpload={onImageUpload}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Name"
          value={row.name}
          type="text"
          isEditing={isEditing}
          compact
          onValueChange={(value) => onValueChange("name", String(value))}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Category"
          value={row.category}
          type="select"
          isEditing={isEditing}
          compact
          options={VARIETY_CATEGORIES.map((category) => ({
            value: category,
            label: categoryLabels[category],
          }))}
          onValueChange={(value) =>
            onValueChange("category", String(value) as InventoryRow["category"])
          }
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Stock"
          value={row.stock}
          type="select"
          isEditing={isEditing}
          compact
          options={STOCK_STATUSES.map((status) => ({
            value: status,
            label: stockLabels[status],
          }))}
          onValueChange={(value) =>
            onValueChange("stock", String(value) as InventoryRow["stock"])
          }
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Price"
          value={row.price}
          type="number"
          isEditing={isEditing}
          compact
          step={1}
          onValueChange={(value) => onValueChange("price", Number(value))}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Sale price"
          value={row.salePrice ?? ""}
          type="number"
          isEditing={isEditing}
          compact
          step={1}
          onValueChange={(value) => {
            const nextValue = String(value).trim();
            onValueChange(
              "salePrice",
              nextValue.length > 0 ? Number(nextValue) : null,
            );
          }}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Colors"
          value={row.color}
          type="multi-combobox"
          isEditing={isEditing}
          compact
          options={colorOptions}
          onValueChange={(value) =>
            onValueChange("color", Array.isArray(value) ? value : [])
          }
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Bloom size"
          value={row.bloomSize}
          type="text"
          isEditing={isEditing}
          compact
          onValueChange={(value) => onValueChange("bloomSize", String(value))}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Height"
          value={row.height}
          type="text"
          isEditing={isEditing}
          compact
          onValueChange={(value) => onValueChange("height", String(value))}
        />
      </td>

      <td className="px-2 py-2 align-top">
        <EditableCell
          label="Hide page"
          value={row.hidden}
          type="checkbox"
          isEditing={isEditing}
          compact
          onValueChange={(value) => onValueChange("hidden", Boolean(value))}
        />
      </td>

      <td className="px-2 py-2 align-top">
        {isEditing ? (
          <EditableCell
            label="Description"
            value={row.description}
            type="textarea"
            isEditing={isEditing}
            compact
            onValueChange={(value) =>
              onValueChange("description", String(value))
            }
          />
        ) : (
          <div className="space-y-2">
            <span className="block text-xs leading-snug text-ink">
              {row.description || "—"}
            </span>
            <span className="block text-[11px] uppercase tracking-widest text-stone-500">
              Updated {formatAdminDate(row.updatedAt)}
            </span>
          </div>
        )}
      </td>

      <td className="px-2 py-2 align-top">
        <div className="flex justify-end">
          <RowActions
            isEditing={isEditing}
            isDeleting={isDeleting}
            isSaving={isSaving}
            onEdit={onEdit}
            onCancel={onCancel}
            onDelete={onDelete}
            onSave={onSave}
          />
        </div>
      </td>
    </tr>
  );
}
