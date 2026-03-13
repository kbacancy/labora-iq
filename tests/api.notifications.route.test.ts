import { beforeEach, describe, expect, it, vi } from "vitest";

const assertAuthenticatedFromRequestMock = vi.fn();
const notificationsSingleMock = vi.fn();
const notificationsUpdateEqOrgMock = vi.fn();
const notificationsUpdateEqIdMock = vi.fn();
const notificationsUpdateMock = vi.fn();
const notificationsInsertMock = vi.fn();

vi.mock("@/src/lib/admin-auth", () => ({
  assertAuthenticatedFromRequest: assertAuthenticatedFromRequestMock,
}));

vi.mock("@/src/lib/supabase-server", () => ({
  supabaseServerAdmin: {
    from: (table: string) => {
      if (table !== "notifications") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            single: notificationsSingleMock,
          }),
        }),
        update: notificationsUpdateMock,
        insert: notificationsInsertMock,
      };
    },
  },
}));

describe("PATCH /api/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    assertAuthenticatedFromRequestMock.mockResolvedValue({
      ok: true,
      userId: "user-1",
      orgId: "org-1",
      role: "technician",
    });

    notificationsUpdateEqOrgMock.mockReturnValue({
      or: vi.fn().mockResolvedValue({ error: null }),
    });

    notificationsUpdateEqIdMock.mockReturnValue({
      eq: notificationsUpdateEqOrgMock,
    });

    notificationsUpdateMock.mockReturnValue({
      eq: notificationsUpdateEqIdMock,
    });
  });

  it("marks a recipient notification as read", async () => {
    notificationsSingleMock.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        org_id: "org-1",
        recipient_user_id: "user-1",
        recipient_role: null,
        is_read: false,
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/notifications/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          notificationId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      }) as never
    );

    const payload = (await response.json()) as { success: boolean; message: string };
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("marked as read");
    expect(notificationsUpdateMock).toHaveBeenCalledWith({ is_read: true });
  });

  it("rejects read updates for non-recipients", async () => {
    notificationsSingleMock.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        org_id: "org-1",
        recipient_user_id: "someone-else",
        recipient_role: "admin",
        is_read: false,
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/notifications/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          notificationId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      }) as never
    );

    const payload = (await response.json()) as { error: string };
    expect(response.status).toBe(403);
    expect(payload.error).toContain("cannot update");
    expect(notificationsUpdateMock).not.toHaveBeenCalled();
  });

  it("marks all matching notifications as read", async () => {
    const { PATCH } = await import("@/app/api/notifications/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_all_read",
        }),
      }) as never
    );

    const payload = (await response.json()) as { success: boolean; message: string };
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("Notifications marked as read");
    expect(notificationsUpdateMock).toHaveBeenCalledWith({ is_read: true });
  });
});
