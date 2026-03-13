"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { NotificationsProvider } from "@/src/context/NotificationsContext";
import { hasRouteAccess } from "@/src/lib/rbac";
import { DashboardShell } from "@/src/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasRouteAccess(role, pathname) && pathname !== "/dashboard") {
      router.replace("/dashboard");
    }
  }, [loading, pathname, role, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasRouteAccess(role, pathname) && pathname === "/dashboard") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="max-w-lg rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 text-sm text-amber-200">
          <p className="font-medium">Profile role is missing or invalid.</p>
          <p className="mt-2 text-amber-300/90">
            Ask an admin to create/update your row in <code>public.profiles</code> with a valid role:
            <code className="ml-1">admin</code>, <code>receptionist</code>, or <code>technician</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <DashboardShell>{children}</DashboardShell>
    </NotificationsProvider>
  );
}
