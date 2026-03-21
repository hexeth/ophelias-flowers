import React from "react";

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
        className="border border-stone-300 px-3 py-2 text-xs uppercase tracking-widest text-stone-500 hover:border-ink hover:text-ink transition-colors"
        disabled={isBusy}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="border border-ink bg-ink px-3 py-2 text-xs uppercase tracking-widest text-white hover:bg-white hover:text-ink transition-colors disabled:border-stone-300 disabled:bg-white disabled:text-stone-300"
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
        className="border border-ink px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-white transition-colors disabled:border-stone-300 disabled:text-stone-300"
        disabled={isBusy}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center justify-center border border-stone-300 px-3 py-2 text-dahlia-wine hover:border-dahlia-wine hover:bg-dahlia-wine hover:text-white transition-colors disabled:border-stone-300 disabled:text-stone-300"
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
