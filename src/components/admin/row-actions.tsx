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
  const { isEditing, isDeleting, isSaving, onEdit, onCancel, onDelete, onSave } =
    props;
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
        onClick={onDelete}
        className="border border-dahlia-wine px-3 py-2 text-xs uppercase tracking-widest text-dahlia-wine hover:bg-dahlia-wine hover:text-white transition-colors disabled:border-stone-300 disabled:text-stone-300"
        disabled={isBusy}
      >
        {isDeleting ? "Deleting" : "Delete"}
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="border border-ink px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-white transition-colors disabled:border-stone-300 disabled:text-stone-300"
        disabled={isBusy}
      >
        Edit
      </button>
    </div>
  );
}
