"use client";

import Link from "next/link";
import { useNotifications } from "@/src/context/NotificationsContext";

export const NotificationBell = () => {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/90 hover:text-white"
    >
      <span className="h-2 w-2 rounded-full bg-blue-400" />
      <span>Notifications</span>
      {unreadCount > 0 ? (
        <span className="rounded-full border border-blue-300/40 bg-blue-500 px-2 py-0.5 text-xs text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
};
