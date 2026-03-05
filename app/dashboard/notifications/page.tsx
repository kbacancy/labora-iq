"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import type { Notification } from "@/src/types/database";

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    if (!user || !role) {
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("*")
      .or(`recipient_user_id.eq.${user.id},recipient_role.eq.${role}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void loadNotifications();
    const channelName = `notifications-page-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [role, user?.id]);

  const markOneRead = async (id: string) => {
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  };

  const markAllRead = async () => {
    if (!user || !role) {
      return;
    }
    setMarkingAll(true);
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .or(`recipient_user_id.eq.${user.id},recipient_role.eq.${role}`)
      .eq("is_read", false);
    setMarkingAll(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Notifications" description="Operational updates across samples, results, and reports." />

      <button
        type="button"
        onClick={() => void markAllRead()}
        disabled={markingAll}
        className="mb-4 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {markingAll ? "Marking..." : "Mark All Read"}
      </button>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading notifications...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No notifications.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3 text-gray-300">{item.message}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    {item.is_read ? (
                      <span className="rounded-md bg-gray-700/40 px-2 py-1 text-xs text-gray-300">Read</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markOneRead(item.id)}
                        className="rounded-md border border-indigo-700 px-2 py-1 text-xs text-indigo-300 transition hover:border-indigo-500"
                      >
                        Mark read
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
