import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchPublicVarietySuggestionsMock } = vi.hoisted(() => ({
  searchPublicVarietySuggestionsMock: vi.fn(),
}));

vi.mock("../../../lib/varieties", () => ({
  searchPublicVarietySuggestions: searchPublicVarietySuggestionsMock,
}));

import { GET } from "./search";

describe("GET /api/varieties/search", () => {
  beforeEach(() => {
    searchPublicVarietySuggestionsMock.mockReset();
  });

  it("returns an empty array when no query is provided", async () => {
    const response = await GET({
      request: new Request("https://example.com/api/varieties/search"),
      locals: {},
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ suggestions: [] });
    expect(searchPublicVarietySuggestionsMock).not.toHaveBeenCalled();
  });

  it("returns ranked suggestions for a query", async () => {
    searchPublicVarietySuggestionsMock.mockResolvedValue([
      {
        category: "decorative",
        imageUrl: "/catalog-images/cafe.jpg",
        name: "Cafe au Lait",
        slug: "cafe-au-lait",
        sku: "DAH-CAL-001",
        stock: "available",
      },
    ]);

    const response = await GET({
      request: new Request("https://example.com/api/varieties/search?q=cafe"),
      locals: {},
    } as never);

    expect(searchPublicVarietySuggestionsMock).toHaveBeenCalledWith(
      {},
      "cafe",
      6,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      suggestions: [
        {
          category: "decorative",
          imageUrl: "/catalog-images/cafe.jpg",
          name: "Cafe au Lait",
          slug: "cafe-au-lait",
          sku: "DAH-CAL-001",
          stock: "available",
        },
      ],
    });
  });
});
