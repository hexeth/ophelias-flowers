import React from "react";
import {
  inventoryDangerButtonClassName,
  inventoryPrimaryButtonClassName,
  inventorySecondaryButtonClassName,
  inventorySubtleButtonClassName,
} from "./inventory-table-controls";

interface RowActionsProps {
  isEditing: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}

export function RowActions(props: RowActionsProps) {
  const {
    isEditing,
    isDeleting,
    isSaving,
    onEdit,
    onCancel,
    onDelete,
    onSave,
  } = props;
  const isBusy = isSaving || isDeleting;

  return isEditing ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className={`${inventorySubtleButtonClassName} px-3`}
        disabled={isBusy}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className={`${inventoryPrimaryButtonClassName} px-3`}
        disabled={isBusy}
      >
        {isSaving ? "Saving" : "Save"}
      </button>
    </div>
  ) : (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEdit}
        className={`${inventorySecondaryButtonClassName} px-3`}
        disabled={isBusy}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={`${inventoryDangerButtonClassName} min-w-[44px] px-3`}
        disabled={isBusy}
        aria-label={isDeleting ? "Deleting variety" : "Delete variety"}
        title={isDeleting ? "Deleting variety" : "Delete variety"}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
          <path d="M6.75 6l.9 12.12A2 2 0 0 0 9.64 20h4.72a2 2 0 0 0 1.99-1.88L17.25 6" />
          <path d="M10 10.25v5.5" />
          <path d="M14 10.25v5.5" />
        </svg>
        <span className="sr-only">
          {isDeleting ? "Deleting variety" : "Delete variety"}
        </span>
      </button>
    </div>
  );
}
