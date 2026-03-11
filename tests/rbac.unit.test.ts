import { describe, expect, it } from "vitest";
import { hasRouteAccess, normalizeRole } from "../src/lib/rbac";

describe("normalizeRole", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeRole(" ADMIN ")).toBe("admin");
    expect(normalizeRole("Technician")).toBe("technician");
    expect(normalizeRole(" receptionist ")).toBe("receptionist");
  });

  it("returns null for empty or unknown roles", () => {
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole("  ")).toBeNull();
    expect(normalizeRole("manager")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });
});

describe("hasRouteAccess", () => {
  it("allows valid role for exact route", () => {
    expect(hasRouteAccess("admin", "/dashboard")).toBe(true);
    expect(hasRouteAccess("receptionist", "/dashboard/patients")).toBe(true);
    expect(hasRouteAccess("technician", "/dashboard/results")).toBe(true);
  });

  it("allows valid role for nested route", () => {
    expect(hasRouteAccess("admin", "/dashboard/patients/new")).toBe(true);
    expect(hasRouteAccess("technician", "/dashboard/results/abc")).toBe(true);
  });

  it("denies invalid role/route combinations", () => {
    expect(hasRouteAccess("receptionist", "/dashboard/tests")).toBe(false);
    expect(hasRouteAccess("technician", "/dashboard/inventory")).toBe(false);
    expect(hasRouteAccess("admin", "/not-a-route")).toBe(false);
    expect(hasRouteAccess(null, "/dashboard")).toBe(false);
    expect(hasRouteAccess("MANAGER", "/dashboard")).toBe(false);
  });
});
