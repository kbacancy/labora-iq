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
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_38%),radial-gradient(circle_at_76%_4%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.78),transparent_78%)]" />
      <Sidebar />
      <div className="relative z-10 lg:ml-72">
        <header className="sticky top-0 z-20 px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(9,14,26,0.88),rgba(9,14,26,0.7))] px-5 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/55 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {currentPage.title}
              </span>
              <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                Signed in as {displayName}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/55 px-2 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              <NotificationBell />
              {role === "admin" ? (
                <Link
                  href="/admin"
                  className="rounded-xl border border-slate-700 bg-slate-900/55 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                >
                  Admin Console
                </Link>
              ) : null}
              {roleLabel ? (
                <span className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-200">
                  {roleLabel}
                </span>
              ) : null}
              <button
                onClick={onSignOut}
                disabled={signingOut}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:border-red-500/70 hover:text-red-100"
              >
                {signingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 pb-8 pt-1 md:px-8">{children}</main>
      </div>
    </div>
  );
};
