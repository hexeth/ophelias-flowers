import React from "react";
import {
  inventoryDangerButtonClassName,
  inventorySubtleButtonClassName,
} from "./inventory-table-controls";
import type { InventoryRow } from "../../lib/catalog/admin-inventory-table";

interface InventoryDeleteDialogProps {
  confirmDeleteRow: InventoryRow | null;
  deleteDialogRef: React.RefObject<HTMLDialogElement | null>;
  deletingRowId: string | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function InventoryDeleteDialog(props: InventoryDeleteDialogProps) {
  const {
    confirmDeleteRow,
    deleteDialogRef,
    deletingRowId,
    onClose,
    onConfirmDelete,
  } = props;

  return (
    <dialog
      ref={deleteDialogRef}
      className="w-full max-w-lg border border-ink bg-cream p-0 text-ink backdrop:bg-ink/40"
      aria-labelledby="delete-variety-title"
      onClose={onClose}
    >
      <form method="dialog" className="space-y-6 p-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-dahlia-wine">
            Confirm deletion
          </p>
          <h2
            id="delete-variety-title"
            className="font-serif text-3xl tracking-tight text-ink"
          >
            Delete {confirmDeleteRow?.name.trim() || "this variety"}?
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-stone-500">
            This removes the variety from the catalog and the admin inventory
            table. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="submit" className={inventorySubtleButtonClassName}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={
              !confirmDeleteRow || deletingRowId === confirmDeleteRow.id
            }
            className={inventoryDangerButtonClassName}
          >
            {confirmDeleteRow && deletingRowId === confirmDeleteRow.id
              ? "Deleting"
              : "Delete variety"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
