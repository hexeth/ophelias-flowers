import React from "react";

interface InventoryTablePaginationProps {
  onNextPage: () => void;
  onPreviousPage: () => void;
  page: number;
  rangeEnd: number;
  rangeStart: number;
  totalCount: number;
  totalPages: number;
}

export function InventoryTablePagination(props: InventoryTablePaginationProps) {
  const {
    onNextPage,
    onPreviousPage,
    page,
    rangeEnd,
    rangeStart,
    totalCount,
    totalPages,
  } = props;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink pt-6">
      <button
        type="button"
        onClick={onPreviousPage}
        disabled={page <= 1}
        className="border border-ink px-4 py-3 text-xs uppercase tracking-widest transition-colors hover:bg-ink hover:text-white disabled:border-stone-300 disabled:text-stone-300"
      >
        Previous
      </button>

      <p className="text-xs uppercase tracking-widest text-stone-500">
        Page {page} of {totalPages} · {rangeStart}-{rangeEnd} of {totalCount}
      </p>

      <button
        type="button"
        onClick={onNextPage}
        disabled={page >= totalPages}
        className="border border-ink px-4 py-3 text-xs uppercase tracking-widest transition-colors hover:bg-ink hover:text-white disabled:border-stone-300 disabled:text-stone-300"
      >
        Next
      </button>
    </div>
  );
}
