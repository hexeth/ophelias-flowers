import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryTablePagination } from "./inventory-table-pagination";

function renderPagination(
  overrides: Partial<Parameters<typeof InventoryTablePagination>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(InventoryTablePagination, {
      onNextPage: vi.fn(),
      onPreviousPage: vi.fn(),
      page: 1,
      rangeEnd: 25,
      rangeStart: 1,
      totalCount: 50,
      totalPages: 2,
      ...overrides,
    }),
  );
}

describe("InventoryTablePagination", () => {
  it("renders Previous and Next buttons", () => {
    const html = renderPagination();
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
  });

  it("shows the page indicator", () => {
    const html = renderPagination({ page: 2, totalPages: 5 });
    expect(html).toContain("Page 2 of 5");
  });

  it("shows the range and total count", () => {
    const html = renderPagination({
      rangeStart: 26,
      rangeEnd: 50,
      totalCount: 50,
    });
    expect(html).toContain("26-50 of 50");
  });

  it("disables Previous on the first page", () => {
    const html = renderPagination({ page: 1, totalPages: 3 });
    const previousIndex = html.indexOf("Previous");
    const previousButtonSlice = html.slice(0, previousIndex);
    expect(previousButtonSlice).toContain("disabled");
  });

  it("disables Next on the last page", () => {
    const html = renderPagination({ page: 3, totalPages: 3 });
    const nextIndex = html.indexOf("Next");
    const nextButtonSlice = html.slice(0, nextIndex);
    expect(nextButtonSlice).toContain("disabled");
  });

  it("does not disable Previous when past the first page", () => {
    const html = renderPagination({ page: 2, totalPages: 3 });
    const previousIndex = html.indexOf("Previous");
    const previousButtonSlice = html.slice(
      html.lastIndexOf("<button", previousIndex),
      previousIndex,
    );
    expect(previousButtonSlice).not.toContain('disabled=""');
  });

  it("does not disable Next when before the last page", () => {
    const html = renderPagination({ page: 1, totalPages: 3 });
    const nextIndex = html.indexOf("Next");
    const nextButtonSlice = html.slice(
      html.lastIndexOf("<button", nextIndex),
      nextIndex,
    );
    expect(nextButtonSlice).not.toContain('disabled=""');
  });

  it("renders nothing when totalCount is zero", () => {
    const html = renderPagination({ totalCount: 0 });
    expect(html).toBe("");
  });
});
