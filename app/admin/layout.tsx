"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, role, router, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <p className="text-sm text-gray-400">Redirecting to login...</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="max-w-lg rounded-xl border border-red-900/40 bg-red-950/20 p-5 text-sm text-red-200">
          <p className="font-medium">Admin access required.</p>
          <p className="mt-2 text-red-300/90">
            Your account role is <code>{role ?? "unknown"}</code>. Use an admin account to open <code>/admin</code>.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-gray-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div>
            <h1 className="text-xl font-semibold">Admin Management</h1>
            <p className="text-sm text-gray-400">Manage LaboraIQ internal users and roles.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 transition hover:border-indigo-400"
          >
            Back to Dashboard
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
