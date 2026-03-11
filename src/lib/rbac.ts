import type { Role } from "@/src/types/database";

const ROLE_VALUES: Role[] = ["admin", "receptionist", "technician"];

export const normalizeRole = (role: string | null | undefined): Role | null => {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return ROLE_VALUES.includes(normalized as Role) ? (normalized as Role) : null;
};

export const ROUTE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["admin", "receptionist", "technician"],
  "/dashboard/patients": ["admin", "receptionist"],
  "/dashboard/patients/new": ["admin", "receptionist"],
  "/dashboard/tests": ["admin"],
  "/dashboard/tests/new": ["admin"],
  "/dashboard/orders": ["admin", "receptionist", "technician"],
  "/dashboard/orders/new": ["admin", "receptionist"],
  "/dashboard/samples": ["admin", "receptionist", "technician"],
  "/dashboard/results": ["admin", "technician"],
  "/dashboard/reports": ["admin", "technician"],
  "/dashboard/inventory": ["admin"],
  "/dashboard/notifications": ["admin", "receptionist", "technician"],
};

export const hasRouteAccess = (role: string | null, pathname: string): boolean => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  const matchingEntries = Object.entries(ROUTE_ROLES)
    .filter(([route]) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b[0].length - a[0].length);

  const entry = matchingEntries[0];
  if (!entry) {
    return false;
  }

  return entry[1].includes(normalizedRole);
};

export const sidebarByRole: Record<Role, Array<{ label: string; href: string }>> = {
  admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Patients", href: "/dashboard/patients" },
    { label: "Tests", href: "/dashboard/tests" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Samples", href: "/dashboard/samples" },
    { label: "Results", href: "/dashboard/results" },
    { label: "Reports", href: "/dashboard/reports" },
    { label: "Inventory", href: "/dashboard/inventory" },
  ],
  receptionist: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Patients", href: "/dashboard/patients" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Samples", href: "/dashboard/samples" },
  ],
  technician: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Samples", href: "/dashboard/samples" },
    { label: "Results", href: "/dashboard/results" },
    { label: "Reports", href: "/dashboard/reports" },
  ],
};
