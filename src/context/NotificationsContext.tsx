"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

interface NotificationsContextValue {
  unreadCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCountOptimistic: (nextUnreadCount: number) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id || !role) {
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or(`recipient_user_id.eq.${user.id},recipient_role.eq.${role}`)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [role, user?.id]);

  const setUnreadCountOptimistic = useCallback((nextUnreadCount: number) => {
    setUnreadCount(Math.max(nextUnreadCount, 0));
  }, []);

  useEffect(() => {
    if (!user?.id || !role) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const channelName = `notifications-shared-${user.id}`;

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
  }, [role, user?.id]);

  const value = useMemo(
    () => ({
      unreadCount,
      loading,
      refreshUnreadCount,
      setUnreadCountOptimistic,
    }),
    [loading, refreshUnreadCount, setUnreadCountOptimistic, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};
