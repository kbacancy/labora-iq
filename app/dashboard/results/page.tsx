"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { createAuditLog } from "@/src/lib/audit";
import { createNotification } from "@/src/lib/notifications";

interface PendingOrder {
  id: string;
  status: "pending" | "in_progress" | "completed";
  approval_status: "draft" | "reviewed" | "approved";
  referring_doctor_name: string | null;
  patient: { name: string };
  tests: Array<{
    test_id: string;
    test_name: string;
    normal_range: string;
  }>;
}

interface PendingOrderQueryRow {
  id: string;
  status: "pending" | "in_progress" | "completed" | null;
  approval_status: "draft" | "reviewed" | "approved" | null;
  referring_doctor_name: string | null;
  assigned_to: string | null;
  patients: { name: string }[] | { name: string } | null;
  order_tests: Array<{
    test_id: string;
    tests: { test_name: string; normal_range: string }[] | { test_name: string; normal_range: string } | null;
  }> | null;
}

interface ResultFormValues {
  [testId: string]: {
    result_value: string;
    remarks?: string;
  };
}

const resultFieldSchema = z.object({
  result_value: z.string().min(1, "Result value is required."),
  remarks: z.string().optional(),
});

export default function ResultsPage() {
  const { user, role, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdFromQuery = searchParams.get("orderId");
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingApproval, setUpdatingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<ResultFormValues>();

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const loadPendingOrders = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("lab_orders")
      .select(
        `
          id,
          status,
          approval_status,
          referring_doctor_name,
          assigned_to,
          patients(name),
          order_tests(
            test_id,
            tests(test_name, normal_range)
          )
        `
      )
      .order("created_at", { ascending: true });

    if (role === "admin") {
      query = query.or("status.neq.completed,approval_status.neq.approved");
    } else {
      query = query.neq("status", "completed");
    }

    if (role === "technician" && user?.id) {
      query = query.or(`assigned_to.eq.${user.id},status.eq.pending`);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const mapped: PendingOrder[] = ((data ?? []) as PendingOrderQueryRow[]).map((row) => ({
      id: row.id,
      status: row.status ?? "pending",
      approval_status: row.approval_status ?? "draft",
      referring_doctor_name: row.referring_doctor_name ?? null,
      patient: {
        name: (Array.isArray(row.patients) ? row.patients[0]?.name : row.patients?.name) ?? "-",
      },
      tests: (Array.isArray(row.order_tests) ? row.order_tests : []).map((item) => {
        const testInfo = Array.isArray(item.tests) ? item.tests[0] : item.tests;
        return {
          test_id: item.test_id,
          test_name: testInfo?.test_name ?? "-",
          normal_range: testInfo?.normal_range ?? "-",
        };
      }),
    }));

    setOrders(mapped);
    if (mapped.length > 0) {
      if (orderIdFromQuery && mapped.some((row) => row.id === orderIdFromQuery)) {
        setSelectedOrderId(orderIdFromQuery);
      } else {
        setSelectedOrderId(mapped[0].id);
      }
    } else {
      setSelectedOrderId("");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPendingOrders();
  }, [role, user?.id, orderIdFromQuery]);

  useEffect(() => {
    if (!selectedOrder) {
      reset({});
      return;
    }
    const defaults = selectedOrder.tests.reduce((accumulator, test) => {
      accumulator[test.test_id] = { result_value: "", remarks: "" };
      return accumulator;
    }, {} as ResultFormValues);
    reset(defaults);
  }, [reset, selectedOrder]);

  useEffect(() => {
    const markInProgress = async () => {
      if (!selectedOrder || selectedOrder.status !== "pending") {
        return;
      }

      const { error: markError } = await supabase
        .from("lab_orders")
        .update({ status: "in_progress" })
        .eq("id", selectedOrder.id)
        .eq("status", "pending");

      if (markError) {
        setError(markError.message);
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                status: "in_progress",
              }
            : order
        )
      );
    };

    void markInProgress();
  }, [selectedOrder]);

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedOrder) {
      return;
    }

    setError(null);
    setSuccess(null);

    const rows = selectedOrder.tests.map((test) => ({
      test_id: test.test_id,
      ...values[test.test_id],
    }));

    for (const row of rows) {
      const parsed = resultFieldSchema.safeParse(row);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid result data.");
        return;
      }
    }

    setSaving(true);

    const payload = rows.map((row) => ({
      order_id: selectedOrder.id,
      test_id: row.test_id,
      result_value: row.result_value,
      remarks: row.remarks || null,
      entered_by: user?.id ?? null,
    }));

    const { error: insertError } = await supabase
      .from("results")
      .upsert(payload, { onConflict: "order_id,test_id" });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("lab_orders")
      .update({
        status: "completed",
        approval_status: "draft",
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        approved_by: null,
        approved_by_name: null,
        approved_at: null,
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
      })
      .eq("id", selectedOrder.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Results saved and order marked as completed.");
    await createAuditLog({
      userId: user?.id ?? null,
      action: "results_saved",
      tableName: "results",
      recordId: selectedOrder.id,
    });
    await createNotification({
      recipientRole: "admin",
      type: "results_submitted",
      title: "Results Submitted",
      message: `Results were submitted for order ${selectedOrder.id.slice(0, 8)}.`,
      entityType: "lab_orders",
      entityId: selectedOrder.id,
      createdBy: user?.id ?? null,
    });
    await loadPendingOrders();
    router.replace("/dashboard/orders?refresh=1");
  });

  const updateApprovalStatus = async (nextStatus: "reviewed" | "approved") => {
    if (!selectedOrder || role !== "admin") {
      return;
    }

    setUpdatingApproval(true);
    setError(null);
    setSuccess(null);

    const now = new Date().toISOString();
    const payload =
      nextStatus === "reviewed"
        ? {
            approval_status: "reviewed" as const,
            reviewed_by: user?.id ?? null,
            reviewed_by_name: profile?.full_name ?? "Admin",
            reviewed_at: now,
          }
        : {
            approval_status: "approved" as const,
            approved_by: user?.id ?? null,
            approved_by_name: profile?.full_name ?? "Admin",
            approved_at: now,
          };

    const { error: updateError } = await supabase
      .from("lab_orders")
      .update(payload)
      .eq("id", selectedOrder.id);

    setUpdatingApproval(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(nextStatus === "reviewed" ? "Order reviewed." : "Order approved.");
    await createAuditLog({
      userId: user?.id ?? null,
      action: nextStatus === "reviewed" ? "report_reviewed" : "report_approved",
      tableName: "lab_orders",
      recordId: selectedOrder.id,
    });
    if (nextStatus === "approved") {
      await createNotification({
        recipientRole: "technician",
        type: "report_approved",
        title: "Report Approved",
        message: `Report for order ${selectedOrder.id.slice(0, 8)} has been approved.`,
        entityType: "lab_orders",
        entityId: selectedOrder.id,
        createdBy: user?.id ?? null,
      });
      await createNotification({
        recipientRole: "receptionist",
        type: "report_approved",
        title: "Report Approved",
        message: `Report for order ${selectedOrder.id.slice(0, 8)} is now ready.`,
        entityType: "lab_orders",
        entityId: selectedOrder.id,
        createdBy: user?.id ?? null,
      });
    }
    await loadPendingOrders();
  };

  return (
    <RoleGate allowedRoles={["admin", "technician"]}>
      <PageHeader title="Result Entry" description="Record test outcomes and complete pending orders." />

      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <label className="mb-1 block text-sm text-gray-300">Select Order</label>
        <select
          value={selectedOrderId}
          onChange={(event) => setSelectedOrderId(event.target.value)}
          disabled={loading || orders.length === 0}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
        >
          {orders.length === 0 ? <option value="">No orders available</option> : null}
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.id.slice(0, 8)} - {order.patient.name}
            </option>
          ))}
        </select>
        {selectedOrder ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-gray-700 px-2 py-1 text-gray-300">
              Order status: {selectedOrder.status}
            </span>
            <span className="rounded-md border border-indigo-700/60 bg-indigo-500/10 px-2 py-1 text-indigo-300">
              Approval: {selectedOrder.approval_status}
            </span>
            {selectedOrder.referring_doctor_name ? (
              <span className="rounded-md border border-gray-700 px-2 py-1 text-gray-300">
                Ref. Dr: {selectedOrder.referring_doctor_name}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading pending orders...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      {success ? <p className="mb-3 text-sm text-emerald-300">{success}</p> : null}

      {selectedOrder ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {selectedOrder.tests.map((test) => {
            const path = watch(test.test_id);
            return (
              <div key={test.test_id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="font-medium text-gray-100">{test.test_name}</p>
                <p className="mb-3 text-xs text-gray-400">Normal Range: {test.normal_range}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    {...register(`${test.test_id}.result_value`)}
                    placeholder="Result value"
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  />
                  <input
                    {...register(`${test.test_id}.remarks`)}
                    placeholder="Remarks (optional)"
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  />
                </div>
                {!path?.result_value ? (
                  <p className="mt-2 text-xs text-gray-500">Enter result value to complete this test.</p>
                ) : null}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Results"}
          </button>
          {role === "admin" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={updatingApproval || selectedOrder.approval_status === "reviewed" || selectedOrder.approval_status === "approved"}
                onClick={() => void updateApprovalStatus("reviewed")}
                className="rounded-lg border border-blue-700 px-4 py-2 text-sm text-blue-300 transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingApproval ? "Updating..." : "Mark Reviewed"}
              </button>
              <button
                type="button"
                disabled={updatingApproval || selectedOrder.approval_status === "approved" || selectedOrder.status !== "completed"}
                onClick={() => void updateApprovalStatus("approved")}
                className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-300 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingApproval ? "Updating..." : "Approve Report"}
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        !loading && <p className="text-sm text-gray-400">No orders available for results workflow.</p>
      )}
    </RoleGate>
  );
}
