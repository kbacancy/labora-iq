import { beforeEach, describe, expect, it, vi } from "vitest";

const assertAuthenticatedFromRequestMock = vi.fn();
const profilesSingleMock = vi.fn();
const labOrdersSingleMock = vi.fn();
const orderTestsEqOrgMock = vi.fn();
const resultsUpsertMock = vi.fn();
const auditInsertMock = vi.fn();
const notificationsInsertMock = vi.fn();
const labOrdersUpdateEqOrgMock = vi.fn();
const labOrdersUpdateEqIdMock = vi.fn();
const labOrdersUpdateMock = vi.fn();

vi.mock("@/src/lib/admin-auth", () => ({
  assertAuthenticatedFromRequest: assertAuthenticatedFromRequestMock,
}));

vi.mock("@/src/lib/supabase-server", () => ({
  supabaseServerAdmin: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: profilesSingleMock,
              }),
            }),
          }),
        };
      }

      if (table === "lab_orders") {
        return {
          select: () => ({
            eq: () => ({
              single: labOrdersSingleMock,
            }),
          }),
          update: labOrdersUpdateMock,
        };
      }

      if (table === "order_tests") {
        return {
          select: () => ({
            eq: () => ({
              eq: orderTestsEqOrgMock,
            }),
          }),
        };
      }

      if (table === "results") {
        return {
          upsert: resultsUpsertMock,
        };
      }

      if (table === "audit_logs") {
        return {
          insert: auditInsertMock,
        };
      }

      if (table === "notifications") {
        return {
          insert: notificationsInsertMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

describe("PATCH /api/workflow/orders/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    profilesSingleMock.mockResolvedValue({
      data: { full_name: "Alex Admin" },
      error: null,
    });

    orderTestsEqOrgMock.mockResolvedValue({
      data: [
        { test_id: "550e8400-e29b-41d4-a716-446655440010" },
        { test_id: "550e8400-e29b-41d4-a716-446655440011" },
      ],
      error: null,
    });

    labOrdersUpdateEqOrgMock.mockResolvedValue({ error: null });
    labOrdersUpdateEqIdMock.mockReturnValue({
      eq: labOrdersUpdateEqOrgMock,
    });
    labOrdersUpdateMock.mockReturnValue({
      eq: labOrdersUpdateEqIdMock,
    });

    resultsUpsertMock.mockResolvedValue({ error: null });
    auditInsertMock.mockResolvedValue({ error: null });
    notificationsInsertMock.mockResolvedValue({ error: null });
  });

  it("blocks technicians from starting orders assigned to someone else", async () => {
    assertAuthenticatedFromRequestMock.mockResolvedValue({
      ok: true,
      userId: "tech-1",
      orgId: "org-1",
      role: "technician",
    });
    labOrdersSingleMock.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        org_id: "org-1",
        status: "in_progress",
        approval_status: "draft",
        assigned_to: "tech-2",
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/workflow/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/workflow/orders/550e8400-e29b-41d4-a716-446655440000", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_in_progress" }),
      }) as never,
      { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) }
    );

    const payload = (await response.json()) as { error: string };
    expect(response.status).toBe(403);
    expect(payload.error).toContain("cannot start");
  });

  it("rejects result submissions that do not match the order tests", async () => {
    assertAuthenticatedFromRequestMock.mockResolvedValue({
      ok: true,
      userId: "tech-1",
      orgId: "org-1",
      role: "technician",
    });
    labOrdersSingleMock.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        org_id: "org-1",
        status: "pending",
        approval_status: "draft",
        assigned_to: "tech-1",
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/workflow/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/workflow/orders/550e8400-e29b-41d4-a716-446655440000", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_results",
          rows: [
            {
              test_id: "550e8400-e29b-41d4-a716-446655440010",
              result_value: "Positive",
            },
          ],
        }),
      }) as never,
      { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) }
    );

    const payload = (await response.json()) as { error: string };
    expect(response.status).toBe(400);
    expect(payload.error).toContain("exact tests");
    expect(resultsUpsertMock).not.toHaveBeenCalled();
  });

  it("allows admins to approve completed orders", async () => {
    assertAuthenticatedFromRequestMock.mockResolvedValue({
      ok: true,
      userId: "admin-1",
      orgId: "org-1",
      role: "admin",
    });
    labOrdersSingleMock.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        org_id: "org-1",
        status: "completed",
        approval_status: "reviewed",
        assigned_to: "tech-1",
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/workflow/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/workflow/orders/550e8400-e29b-41d4-a716-446655440000", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_approval_status",
          next_status: "approved",
        }),
      }) as never,
      { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }) }
    );

    const payload = (await response.json()) as { message: string };
    expect(response.status).toBe(200);
    expect(payload.message).toContain("approved");
    expect(labOrdersUpdateMock).toHaveBeenCalled();
    expect(notificationsInsertMock).toHaveBeenCalled();
  });
});
