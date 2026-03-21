import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditableCell } from "./editable-cell";

describe("EditableCell", () => {
  it("allows number inputs to override the step size", () => {
    const html = renderToStaticMarkup(
      createElement(EditableCell, {
        label: "Price",
        value: 12,
        type: "number",
        isEditing: true,
        step: 1,
      }),
    );

    expect(html).toContain('type="number"');
    expect(html).toContain('step="1"');
  });
});
