import { describe, expect, it } from "vitest";
import { renderDescriptionHtml } from "./render";

describe("renderDescriptionHtml", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(renderDescriptionHtml('<script>alert("x")</script> & bloom')).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; bloom</p>",
    );
  });

  it("splits paragraphs and preserves line breaks inside a paragraph", () => {
    expect(renderDescriptionHtml("First line\nSecond line\n\nThird line")).toBe(
      "<p>First line<br />Second line</p><p>Third line</p>",
    );
  });

  it("drops empty blocks introduced by repeated blank lines", () => {
    expect(renderDescriptionHtml("\n\nOne bloom\n\n\nTwo bloom\n\n")).toBe(
      "<p>One bloom</p><p>Two bloom</p>",
    );
  });
});
