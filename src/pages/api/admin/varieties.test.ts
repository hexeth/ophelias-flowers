import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteVarietyMock } = vi.hoisted(() => ({
  deleteVarietyMock: vi.fn(),
}));

vi.mock("../../../lib/varieties", () => ({
  deleteVariety: deleteVarietyMock,
  listAdminVarieties: vi.fn(),
  saveVariety: vi.fn(),
}));

import { DELETE } from "./varieties";

describe("DELETE /api/admin/varieties", () => {
  beforeEach(() => {
    deleteVarietyMock.mockReset();
  });

  it("requires a variety id", async () => {
    const response = await DELETE({
      request: new Request("https://example.com/api/admin/varieties"),
      locals: {
        auth: () => ({ userId: "user_123" }),
      },
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A variety id is required.",
    });
  });

  it("soft deletes a variety when authorized", async () => {
    deleteVarietyMock.mockResolvedValue({
      id: "variety-1",
      name: "Cafe au Lait",
      deletedAt: "2026-03-20T00:00:00.000Z",
    });

    const response = await DELETE({
      request: new Request(
        "https://example.com/api/admin/varieties?id=variety-1",
      ),
      locals: {
        auth: () => ({ userId: "user_123" }),
      },
    } as never);

    expect(deleteVarietyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.any(Function),
      }),
      "variety-1",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      variety: {
        id: "variety-1",
        name: "Cafe au Lait",
        deletedAt: "2026-03-20T00:00:00.000Z",
      },
    });
  });
});
