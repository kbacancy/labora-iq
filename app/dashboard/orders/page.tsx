"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { DownloadReportButton } from "@/src/components/orders/DownloadReportButton";
import type { LabOrder, Patient } from "@/src/types/database";

interface OrderView extends LabOrder {
  patientName: string;
}

export default function OrdersPage() {
  const { role, user } = useAuth();
  const searchParams = useSearchParams();
  const refreshFlag = searchParams.get("refresh");
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!role) {
      return;
    }
    setLoading(true);
    setError(null);

    const isAssignedColumnMissing = (message?: string) =>
      Boolean(message?.includes("assigned_to") && message?.includes("does not exist"));

    let orderRows: LabOrder[] | null = null;
    let orderError: { message: string } | null = null;

    if (role === "technician") {
      const assignedQuery = await supabase
        .from("lab_orders")
        .select("*")
        .or(`assigned_to.eq.${user?.id ?? ""},status.eq.pending`)
        .order("created_at", { ascending: false });

      if (assignedQuery.error && isAssignedColumnMissing(assignedQuery.error.message)) {
        const fallbackQuery = await supabase
          .from("lab_orders")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        orderRows = fallbackQuery.data;
        orderError = fallbackQuery.error;
      } else {
        orderRows = assignedQuery.data;
        orderError = assignedQuery.error;
      }
    } else {
      const query = await supabase.from("lab_orders").select("*").order("created_at", { ascending: false });
      orderRows = query.data;
      orderError = query.error;
    }

    if (orderError) {
      setError(orderError.message);
      setOrders([]);
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
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [role, user?.id, refreshFlag]);

  const canCreateOrder = role === "admin" || role === "receptionist";
  const canEnterResults = role === "admin" || role === "technician";

  return (
    <div>
      <PageHeader
        title="Lab Orders"
        description="Track order lifecycle and download completed reports."
        actionHref={canCreateOrder ? "/dashboard/orders/new" : undefined}
        actionLabel={canCreateOrder ? "Create Order" : undefined}
      />

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Approval</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Report</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No orders found.{" "}
                  {canCreateOrder ? (
                    <Link className="text-indigo-400" href="/dashboard/orders/new">
                      Create one
                    </Link>
                  ) : null}
                  .
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{order.patientName}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(order.total_price ?? 0))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs uppercase ${
                        order.status === "completed"
                          ? "bg-emerald-600/20 text-emerald-300"
                          : order.status === "in_progress"
                            ? "bg-blue-600/20 text-blue-300"
                            : "bg-amber-600/20 text-amber-300"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs uppercase ${
                        order.approval_status === "approved"
                          ? "bg-emerald-600/20 text-emerald-300"
                          : order.approval_status === "reviewed"
                            ? "bg-blue-600/20 text-blue-300"
                            : "bg-gray-700/40 text-gray-300"
                      }`}
                    >
                      {order.approval_status ?? "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    {order.status === "completed" && order.approval_status === "approved" ? (
                      <DownloadReportButton orderId={order.id} />
                    ) : canEnterResults ? (
                      <Link
                        href={`/dashboard/results?orderId=${order.id}`}
                        className="rounded-md border border-indigo-700 px-2 py-1 text-xs text-indigo-300 transition hover:border-indigo-500"
                      >
                        Enter Results
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-500">Awaiting approval</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
