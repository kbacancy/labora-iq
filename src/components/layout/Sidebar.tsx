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
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-72 border-r border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,0.92)_58%,rgba(4,15,32,0.94))] px-5 py-6 lg:block">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_44%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_34%)]" />
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="shrink-0">
          <p className="text-[2.35rem] font-semibold tracking-tight text-slate-100">LaboraIQ</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.34em] text-slate-500">Lab operations intelligence</p>
        </div>

        <nav className="scrollbar-panel relative mt-10 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group block rounded-2xl border px-4 py-3 text-sm transition ${
                  active
                    ? "border-slate-700 bg-slate-800/80 text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                    : "border-transparent text-slate-300 hover:border-slate-800 hover:bg-slate-900/55 hover:text-slate-100"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{item.label}</span>
                  <span
                    className={`h-2 w-2 rounded-full transition ${
                      active ? "bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.65)]" : "bg-slate-700 group-hover:bg-slate-500"
                    }`}
                  />
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
