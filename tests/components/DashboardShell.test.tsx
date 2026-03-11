import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/src/components/layout/DashboardShell";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/dashboard/notifications",
}));

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    profile: { full_name: "Lab Technician" },
    role: "admin",
    user: { email: "admin1212@yopmail.com" },
    signOut: vi.fn(async () => ({ error: null })),
  }),
}));

vi.mock("@/src/components/layout/Sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}));

vi.mock("@/src/components/layout/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

describe("DashboardShell", () => {
  it("renders contextual title and admin controls", () => {
    render(
      <DashboardShell>
        <div>content</div>
      </DashboardShell>
    );

    expect(screen.getAllByText("Notifications").length).toBeGreaterThan(0);
    expect(screen.getByText("Operational updates and workflow alerts.")).toBeInTheDocument();
    expect(screen.getByText(/Signed in as admin1212/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Console" })).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
