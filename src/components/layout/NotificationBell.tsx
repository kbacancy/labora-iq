"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

export const NotificationBell = () => {
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !role) {
      return;
    }

    let active = true;
    const channelName = `notifications-bell-${user.id}`;

    const loadUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or(`recipient_user_id.eq.${user.id},recipient_role.eq.${role}`)
        .eq("is_read", false);

      if (active) {
        setUnreadCount(count ?? 0);
      }
    };

    void loadUnread();
    const timer = setInterval(() => {
      void loadUnread();
    }, 60000);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void loadUnread();
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [role, user]);

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:border-indigo-400 hover:bg-gray-800/90 hover:text-white"
    >
      <span className="h-2 w-2 rounded-full bg-indigo-400" />
      <span>Notifications</span>
      {unreadCount > 0 ? (
        <span className="rounded-full border border-indigo-300/40 bg-indigo-500 px-2 py-0.5 text-xs text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
};
