"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/src/types/database";
import { useAuth } from "@/src/context/AuthContext";
import { hasRouteAccess } from "@/src/lib/rbac";

interface RoleGateProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const RoleGate = ({ allowedRoles, children }: RoleGateProps) => {
  const { loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAllowed = role ? allowedRoles.includes(role) && hasRouteAccess(role, pathname) : false;

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace("/dashboard");
    }
  }, [isAllowed, loading, router]);

  if (loading || !isAllowed) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">
        Checking permissions...
      </div>
    );
  }

  return <>{children}</>;
};
