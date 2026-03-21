import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RowActions } from "./row-actions";

describe("RowActions", () => {
  it("shows edit before an icon-only delete action for saved rows", () => {
    const html = renderToStaticMarkup(
      createElement(RowActions, {
        isEditing: false,
        isDeleting: false,
        isSaving: false,
        onEdit: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
        onSave: vi.fn(),
      }),
    );

    expect(html).toContain(">Edit<");
    expect(html).toContain('aria-label="Delete variety"');
    expect(html.indexOf(">Edit<")).toBeLessThan(
      html.indexOf('aria-label="Delete variety"'),
    );
  });

  it("shows a busy delete state while a row is being removed", () => {
    const html = renderToStaticMarkup(
      createElement(RowActions, {
        isEditing: false,
        isDeleting: true,
        isSaving: false,
        onEdit: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
        onSave: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Deleting variety"');
    expect(html).toContain('disabled=""');
  });
});
