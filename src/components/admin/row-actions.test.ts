import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RowActions } from "./row-actions";

describe("RowActions", () => {
  it("shows a delete action for saved rows", () => {
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

    expect(html).toContain(">Delete<");
    expect(html).toContain(">Edit<");
  });
});
