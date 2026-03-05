"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/context/AuthContext";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { NotificationBell } from "@/src/components/layout/NotificationBell";

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const { profile, role, user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const roleLabel = role ? { admin: "Admin", receptionist: "Receptionist", technician: "Technician" }[role] : null;
  const normalizedName = profile?.full_name?.trim().toLowerCase();
  const shouldHideRoleLikeName =
    normalizedName === "admin" ||
    normalizedName === "receptionist" ||
    normalizedName === "technician" ||
    normalizedName === "lab technician";
  const fallbackName = user?.email?.split("@")[0] ?? "User";
  const displayName = profile?.full_name && !shouldHideRoleLikeName ? profile.full_name : fallbackName;
  const pageLabelByPath: Array<{ match: string; title: string; subtitle: string }> = [
    { match: "/dashboard/notifications", title: "Notifications", subtitle: "Operational updates and workflow alerts." },
    { match: "/dashboard/reports", title: "Reports", subtitle: "Approved outputs and publication history." },
    { match: "/dashboard/results", title: "Results", subtitle: "Validate and approve laboratory findings." },
    { match: "/dashboard/samples", title: "Samples", subtitle: "Track assignment, status, and readiness." },
    { match: "/dashboard/orders", title: "Orders", subtitle: "Monitor order queue and processing states." },
    { match: "/dashboard/patients", title: "Patients", subtitle: "Patient records and diagnostics journey." },
    { match: "/dashboard/tests", title: "Tests", subtitle: "Catalog and maintain test definitions." },
    { match: "/dashboard/inventory", title: "Inventory", subtitle: "Reagent and stock health overview." },
    { match: "/dashboard", title: "Dashboard", subtitle: "Live laboratory operations at a glance." },
  ];
  const currentPage = pageLabelByPath.find((item) => pathname === item.match || pathname.startsWith(`${item.match}/`)) ?? pageLabelByPath.at(-1)!;

  const onSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    router.replace("/login");

    try {
      const { error } = await signOut();
      if (error) {
        // Keep this non-blocking and force navigation to login.
        console.error("Sign out warning:", error);
      }
    } finally {
      router.replace("/login");
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 300);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gradient-to-b from-gray-950 via-gray-950/95 to-gray-950/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight text-gray-100">{currentPage.title}</p>
              <p className="text-xs text-gray-400">{currentPage.subtitle}</p>
              <p className="mt-1 text-xs text-gray-500">Signed in as {displayName}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-800/80 bg-gray-900/70 px-2 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
              <NotificationBell />
              {role === "admin" ? (
                <Link
                  href="/admin"
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-indigo-400 hover:text-gray-100"
                >
                  Admin
                </Link>
              ) : null}
              {roleLabel ? (
                <span className="rounded-lg border border-gray-700 bg-gray-800/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-200">
                  {roleLabel}
                </span>
              ) : null}
              <button
                onClick={onSignOut}
                disabled={signingOut}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-300 transition hover:border-red-400 hover:text-red-100"
              >
                {signingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};
