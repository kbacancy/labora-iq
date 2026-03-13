import { beforeEach, describe, expect, it, vi } from "vitest";

const signUpMock = vi.fn();
const organizationsInsertMock = vi.fn();
const profilesInsertMock = vi.fn();
const labSettingsUpsertMock = vi.fn();
const auditInsertMock = vi.fn();
const recordOnboardingAttemptMock = vi.fn();
const isOnboardingRateLimitedMock = vi.fn();
const isReasonableOnboardingStartMock = vi.fn();
const isSameOriginRequestMock = vi.fn();
const getRequestIpMock = vi.fn();
const seedStarterTestsForOrgMock = vi.fn();

vi.mock("@/src/lib/supabase-server", () => ({
  supabaseServerAnon: {
    auth: {
      signUp: signUpMock,
    },
  },
  supabaseServerAdmin: {
    from: (table: string) => {
      if (table === "organizations") {
        return { insert: organizationsInsertMock };
      }
      if (table === "profiles") {
        return { insert: profilesInsertMock };
      }
      if (table === "lab_settings") {
        return { upsert: labSettingsUpsertMock };
      }
      if (table === "audit_logs") {
        return { insert: auditInsertMock };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

vi.mock("@/src/lib/onboarding-security", () => ({
  getRequestIp: getRequestIpMock,
  isOnboardingRateLimited: isOnboardingRateLimitedMock,
  isReasonableOnboardingStart: isReasonableOnboardingStartMock,
  isSameOriginRequest: isSameOriginRequestMock,
  recordOnboardingAttempt: recordOnboardingAttemptMock,
}));

vi.mock("@/src/lib/seed-starter-tests", () => ({
  seedStarterTestsForOrg: seedStarterTestsForOrgMock,
}));

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getRequestIpMock.mockReturnValue("127.0.0.1");
    isSameOriginRequestMock.mockReturnValue(true);
    isReasonableOnboardingStartMock.mockReturnValue(true);
    isOnboardingRateLimitedMock.mockResolvedValue({ limited: false, emailCount: 0, ipCount: 0 });

    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          identities: [{ id: "identity-1" }],
        },
      },
      error: null,
    });

    organizationsInsertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "660e8400-e29b-41d4-a716-446655440000" },
          error: null,
        }),
      }),
    });

    profilesInsertMock.mockResolvedValue({ error: null });
    labSettingsUpsertMock.mockResolvedValue({ error: null });
    auditInsertMock.mockResolvedValue({ error: null });
    recordOnboardingAttemptMock.mockResolvedValue(undefined);
    seedStarterTestsForOrgMock.mockResolvedValue({ ok: true, count: 20 });
  });

  it("rejects requests from a mismatched origin", async () => {
    isSameOriginRequestMock.mockReturnValue(false);
    const { POST } = await import("@/app/api/onboarding/route");

    const response = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://evil.example",
          host: "localhost:3000",
        },
        body: JSON.stringify({
          labName: "Acme Diagnostics",
          adminFullName: "Priya Shah",
          adminEmail: "admin@acme.com",
          adminPassword: "Password123",
          phone: "",
          website: "",
          startedAt: new Date(Date.now() - 5_000).toISOString(),
        }),
      })
    );

    const payload = (await response.json()) as { error: string };
    expect(response.status).toBe(403);
    expect(payload.error).toContain("origin");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejects rate-limited onboarding attempts", async () => {
    isOnboardingRateLimitedMock.mockResolvedValue({ limited: true, emailCount: 3, ipCount: 1 });
    const { POST } = await import("@/app/api/onboarding/route");

    const response = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          host: "localhost:3000",
        },
        body: JSON.stringify({
          labName: "Acme Diagnostics",
          adminFullName: "Priya Shah",
          adminEmail: "admin@acme.com",
          adminPassword: "Password123",
          phone: "",
          website: "",
          startedAt: new Date(Date.now() - 5_000).toISOString(),
        }),
      })
    );

    expect(response.status).toBe(429);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("creates a confirmation-pending account for valid requests", async () => {
    const { POST } = await import("@/app/api/onboarding/route");

    const response = await POST(
      new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          host: "localhost:3000",
        },
        body: JSON.stringify({
          labName: "Acme Diagnostics",
          adminFullName: "Priya Shah",
          adminEmail: "admin@acme.com",
          adminPassword: "Password123",
          phone: "",
          website: "",
          startedAt: new Date(Date.now() - 5_000).toISOString(),
        }),
      })
    );

    const payload = (await response.json()) as { success: boolean; message: string };
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("confirm");
    expect(signUpMock).toHaveBeenCalledTimes(1);
    expect(recordOnboardingAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        reason: "confirmation_pending",
      })
    );
  });
});
