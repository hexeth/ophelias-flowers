import React from "react";
import { inventorySecondaryButtonClassName } from "./inventory-table-controls";

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-6">
      <button
        type="button"
        onClick={onPreviousPage}
        disabled={page <= 1}
        className={inventorySecondaryButtonClassName}
      >
        Previous
      </button>

      <p className="order-3 w-full text-center text-xs uppercase tracking-widest text-stone-500 sm:order-none sm:w-auto sm:text-left">
        Page {page} of {totalPages} · {rangeStart}-{rangeEnd} of {totalCount}
      </p>

      <button
        type="button"
        onClick={onNextPage}
        disabled={page >= totalPages}
        className={inventorySecondaryButtonClassName}
      >
        Next
      </button>
    </div>
  );
}
