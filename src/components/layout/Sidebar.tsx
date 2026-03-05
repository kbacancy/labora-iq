"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarByRole } from "@/src/lib/rbac";
import { useAuth } from "@/src/context/AuthContext";

export const Sidebar = () => {
  const pathname = usePathname();
  const { role } = useAuth();

  const items = role ? sidebarByRole[role] : [];

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 border-r border-gray-800 bg-gray-900/95 p-5 lg:block">
      <p className="text-xl font-semibold tracking-tight text-indigo-400">LaboraIQ</p>
      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
