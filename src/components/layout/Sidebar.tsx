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
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 border-r border-slate-800/80 bg-slate-950/95 p-5 lg:block">
      <p className="text-3xl font-semibold tracking-tight text-slate-200">LaboraIQ</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Lab Ops OS</p>
      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
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
