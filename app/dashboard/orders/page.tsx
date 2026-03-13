"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { DownloadReportButton } from "@/src/components/orders/DownloadReportButton";
import {
  StatusBadge,
  compactAccentButtonClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { LabOrder, Patient } from "@/src/types/database";

interface OrderView extends LabOrder {
  patientName: string;
}

export default function OrdersPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const { role, user } = useAuth();
  const searchParams = useSearchParams();
  const refreshFlag = searchParams.get("refresh");
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalOrders, setTotalOrders] = useState(0);

  const loadOrders = useCallback(async () => {
    if (!role) {
      return;
    }
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const isAssignedColumnMissing = (message?: string) =>
      Boolean(message?.includes("assigned_to") && message?.includes("does not exist"));

    let orderRows: LabOrder[] | null = null;
    let orderError: { message: string } | null = null;
    let totalCount = 0;

    if (role === "technician") {
      const assignedQuery = supabase
        .from("lab_orders")
        .select("*", { count: "exact" })
        .or(`assigned_to.eq.${user?.id ?? ""},status.eq.pending`)
        .order("created_at", { ascending: false });
      const rangedAssignedQuery = await assignedQuery.range(from, to);

      if (rangedAssignedQuery.error && isAssignedColumnMissing(rangedAssignedQuery.error.message)) {
        const fallbackQuery = await supabase
          .from("lab_orders")
          .select("*", { count: "exact" })
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .range(from, to);
        orderRows = fallbackQuery.data;
        orderError = fallbackQuery.error;
        totalCount = fallbackQuery.count ?? 0;
      } else {
        orderRows = rangedAssignedQuery.data;
        orderError = rangedAssignedQuery.error;
        totalCount = rangedAssignedQuery.count ?? 0;
      }
    } else {
      const query = await supabase
        .from("lab_orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      orderRows = query.data;
      orderError = query.error;
      totalCount = query.count ?? 0;
    }

    if (orderError) {
      setError(orderError.message);
      setOrders([]);
      setTotalOrders(0);
      setLoading(false);
      return;
    }

    const patientIds = [...new Set((orderRows ?? []).map((order) => order.patient_id))];
    let patientMap = new Map<string, Patient>();

    if (patientIds.length > 0) {
      const { data: patientRows } = await supabase.from("patients").select("*").in("id", patientIds);
      patientMap = new Map((patientRows ?? []).map((patient) => [patient.id, patient]));
    }

    const mapped: OrderView[] = (orderRows ?? []).map((order) => ({
      ...order,
      patientName: patientMap.get(order.patient_id)?.name ?? "-",
    }));

    setOrders(mapped);
    setTotalOrders(totalCount);
    setLoading(false);
  }, [page, pageSize, role, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrders, refreshFlag]);

  const canCreateOrder = role === "admin" || role === "receptionist";
  const canEnterResults = role === "admin" || role === "technician";

  return (
    <div>
      <PageHeader
        title="Lab Orders"
        description="Track order lifecycle, route technicians, and release approved reports from a single operational ledger."
        actionHref={canCreateOrder ? "/dashboard/orders/new" : undefined}
        actionLabel={canCreateOrder ? "Create Order" : undefined}
      />

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Patient</th>
              <th className={tableHeaderCellClassName}>Total</th>
              <th className={tableHeaderCellClassName}>Status</th>
              <th className={tableHeaderCellClassName}>Approval</th>
              <th className={tableHeaderCellClassName}>Date</th>
              <th className={tableHeaderCellClassName}>Report</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-red-300">
                  {error}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No orders found.{" "}
                  {canCreateOrder ? (
                    <Link className="text-blue-300 hover:text-blue-200" href="/dashboard/orders/new">
                      Create one
                    </Link>
                  ) : null}
                  .
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{order.patientName}</td>
                  <td className={tableCellClassName}>{formatCurrency(Number(order.total_price ?? 0))}</td>
                  <td className={tableCellClassName}>
                    <StatusBadge
                      tone={
                        order.status === "completed"
                          ? "good"
                          : order.status === "in_progress"
                            ? "info"
                            : "warn"
                      }
                    >
                      {order.status}
                    </StatusBadge>
                  </td>
                  <td className={tableCellClassName}>
                    <StatusBadge
                      tone={
                        order.approval_status === "approved"
                          ? "good"
                          : order.approval_status === "reviewed"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {order.approval_status ?? "draft"}
                    </StatusBadge>
                  </td>
                  <td className={tableMutedCellClassName}>{formatDate(order.created_at)}</td>
                  <td className={tableCellClassName}>
                    {order.status === "completed" && order.approval_status === "approved" ? (
                      <DownloadReportButton orderId={order.id} />
                    ) : canEnterResults ? (
                      <Link
                        href={`/dashboard/results?orderId=${order.id}`}
                        className={compactAccentButtonClassName}
                      >
                        Enter Results
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">Awaiting approval</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalOrders > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalOrders}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
