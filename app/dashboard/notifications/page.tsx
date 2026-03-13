"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { useNotifications } from "@/src/context/NotificationsContext";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import { resolveNotificationHref } from "@/src/lib/notification-routing";
import {
  StatusBadge,
  compactButtonClassName,
  compactAccentButtonClassName,
  errorTextClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { Notification } from "@/src/types/database";

interface NotificationOrderLookupRow {
  id: string;
  patients: { name: string }[] | { name: string } | null;
}

export default function NotificationsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const { user, role } = useAuth();
  const router = useRouter();
  const { setUnreadCountOptimistic } = useNotifications();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const describeNotification = useCallback(
    (
      item: Notification,
      orderPatientMap: Map<string, string>,
      sampleMap: Map<string, { sampleCode: string; patientName: string; testType: string }>
    ) => {
      const orderPatientName = item.entity_id ? orderPatientMap.get(item.entity_id) : null;
      const sampleDetails = item.entity_id ? sampleMap.get(item.entity_id) : null;

      switch (item.type) {
        case "report_generated":
          return orderPatientName ? `Report is available for ${orderPatientName}.` : item.message;
        case "report_approved":
          return orderPatientName ? `Report for ${orderPatientName} is now ready.` : item.message;
        case "results_submitted":
          return orderPatientName ? `Results were submitted for ${orderPatientName}.` : item.message;
        case "order_created":
          return orderPatientName ? `A new order has been created for ${orderPatientName}.` : item.message;
        case "order_assigned":
          return orderPatientName ? `A new order for ${orderPatientName} has been assigned to you.` : item.message;
        case "sample_assigned":
          return sampleDetails
            ? `Sample ${sampleDetails.sampleCode} has been assigned to you for ${sampleDetails.testType}.`
            : item.message;
        case "sample_status":
          return sampleDetails
            ? `Sample ${sampleDetails.sampleCode} for ${sampleDetails.patientName} was updated.`
            : item.message;
        default:
          return item.message;
      }
    },
    []
  );

  const loadNotifications = useCallback(async () => {
    if (!user || !role) {
      return;
    }

    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: queryError, count } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .or(`recipient_user_id.eq.${user.id},recipient_role.eq.${role}`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setTotalNotifications(0);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Notification[];
    const orderEntityIds = [
      ...new Set(
        rows
          .filter((item) =>
            ["report_generated", "report_approved", "results_submitted", "order_created", "order_assigned"].includes(item.type)
          )
          .map((item) => item.entity_id)
          .filter(Boolean)
      ),
    ] as string[];
    const sampleEntityIds = [
      ...new Set(
        rows
          .filter((item) => ["sample_assigned", "sample_status"].includes(item.type))
          .map((item) => item.entity_id)
          .filter(Boolean)
      ),
    ] as string[];

    const [ordersLookup, samplesLookup] = await Promise.all([
      orderEntityIds.length > 0
        ? supabase.from("lab_orders").select("id,patients(name)").in("id", orderEntityIds)
        : Promise.resolve({ data: [], error: null }),
      sampleEntityIds.length > 0
        ? supabase.from("samples").select("id,sample_code,patient_name,test_type").in("id", sampleEntityIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const orderPatientMap = new Map(
      ((ordersLookup.data ?? []) as NotificationOrderLookupRow[]).map((row) => {
        const patientField = row.patients;
        return [
          row.id,
          Array.isArray(patientField) ? patientField[0]?.name ?? "Patient linked" : patientField?.name ?? "Patient linked",
        ];
      })
    );
    const sampleMap = new Map(
      (samplesLookup.data ?? []).map((row) => [
        row.id,
        {
          sampleCode: row.sample_code,
          patientName: row.patient_name,
          testType: row.test_type,
        },
      ])
    );

    const mappedItems = rows.map((item) => ({ ...item, message: describeNotification(item, orderPatientMap, sampleMap) }));
    setItems(mappedItems);
    setTotalNotifications(count ?? 0);
    setUnreadCountOptimistic(mappedItems.filter((item) => !item.is_read).length);
    setLoading(false);
  }, [describeNotification, page, pageSize, role, setUnreadCountOptimistic, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);
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
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, user?.id]);

  const markOneRead = async (id: string) => {
    try {
      const response = await fetchWithAccessToken("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ action: "mark_read", notificationId: id }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to mark notification as read.");
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to mark notification as read.");
      return;
    }

    setItems((current) => {
      const nextItems = current.map((item) => (item.id === id ? { ...item, is_read: true } : item));
      setUnreadCountOptimistic(nextItems.filter((item) => !item.is_read).length);
      return nextItems;
    });

    return true;
  };

  const openNotification = async (item: Notification) => {
    const href = resolveNotificationHref(item, role);
    if (!href) {
      return;
    }

    if (!item.is_read) {
      await markOneRead(item.id);
    }

    router.push(href);
  };

  const markAllRead = async () => {
    if (!user || !role) {
      return;
    }
    setMarkingAll(true);
    try {
      const response = await fetchWithAccessToken("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to mark notifications as read.");
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to mark notifications as read.");
      return;
    } finally {
      setMarkingAll(false);
    }

    setItems((current) => {
      const nextItems = current.map((item) => ({ ...item, is_read: true }));
      setUnreadCountOptimistic(0);
      return nextItems;
    });
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Notifications" description="Operational updates across orders, samples, results, and approved release activity." />

      <button
        type="button"
        onClick={() => void markAllRead()}
        disabled={markingAll}
        className={`mb-4 ${compactButtonClassName}`}
      >
        {markingAll ? "Marking..." : "Mark All Read"}
      </button>

      {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Title</th>
              <th className={tableHeaderCellClassName}>Message</th>
              <th className={tableHeaderCellClassName}>Type</th>
              <th className={tableHeaderCellClassName}>Created</th>
              <th className={tableHeaderCellClassName}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  Loading notifications...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No notifications.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={`${tableRowClassName} ${resolveNotificationHref(item, role) ? "cursor-pointer hover:bg-slate-900/35" : ""}`}
                  onClick={() => void openNotification(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openNotification(item);
                    }
                  }}
                  role={resolveNotificationHref(item, role) ? "button" : undefined}
                  tabIndex={resolveNotificationHref(item, role) ? 0 : undefined}
                >
                  <td className={tableCellClassName}>
                    <div>
                      <p>{item.title}</p>
                      {resolveNotificationHref(item, role) ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-blue-300">Open workflow</p>
                      ) : null}
                    </div>
                  </td>
                  <td className={tableMutedCellClassName}>{item.message}</td>
                  <td className={tableCellClassName}>{item.type}</td>
                  <td className={tableMutedCellClassName}>{formatDate(item.created_at)}</td>
                  <td className={tableCellClassName}>
                    <div className="flex flex-wrap gap-2">
                      {resolveNotificationHref(item, role) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openNotification(item);
                          }}
                          className={compactButtonClassName}
                        >
                          Open
                        </button>
                      ) : null}
                      {item.is_read ? (
                        <StatusBadge tone="neutral">Read</StatusBadge>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void markOneRead(item.id);
                          }}
                          className={compactAccentButtonClassName}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalNotifications > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalNotifications}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        ) : null}
      </div>
    </RoleGate>
  );
}
