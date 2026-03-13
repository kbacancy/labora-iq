"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import {
  StatusBadge,
  SurfaceSection,
  compactAccentButtonClassName,
  compactButtonClassName,
  errorTextClassName,
  fieldLabelClassName,
  helperTextClassName,
  inputClassName,
  primaryButtonClassName,
  successTextClassName,
} from "@/src/components/ui/surface";

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
  const { user, role } = useAuth();
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
  const orderOptions = useMemo(
    () =>
      orders.map((order) => ({
        value: order.id,
        label: order.patient.name,
        description: `${order.status.replace("_", " ")}${order.referring_doctor_name ? ` • Dr ${order.referring_doctor_name}` : ""}`,
        keywords: [order.id.slice(0, 8), order.patient.name, order.referring_doctor_name ?? ""],
      })),
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const loadPendingOrders = useCallback(async () => {
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
  }, [orderIdFromQuery, role, user?.id]);

  useEffect(() => {
    void loadPendingOrders();
  }, [loadPendingOrders]);

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

      try {
        const response = await fetchWithAccessToken(`/api/workflow/orders/${selectedOrder.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "mark_in_progress" }),
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Unable to start order.");
          return;
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to start order.");
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

    try {
      const response = await fetchWithAccessToken(`/api/workflow/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "submit_results",
          rows: rows.map((row) => ({
            test_id: row.test_id,
            result_value: row.result_value,
            remarks: row.remarks || "",
          })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to save results.");
        return;
      }

      setSuccess(payload.message ?? "Results saved and order marked as completed.");
      await loadPendingOrders();
      router.replace("/dashboard/orders?refresh=1");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save results.");
    } finally {
      setSaving(false);
    }
  });

  const updateApprovalStatus = async (nextStatus: "reviewed" | "approved") => {
    if (!selectedOrder || role !== "admin") {
      return;
    }

    setUpdatingApproval(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithAccessToken(`/api/workflow/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "set_approval_status",
          next_status: nextStatus,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to update approval status.");
        return;
      }

      setSuccess(payload.message ?? (nextStatus === "reviewed" ? "Order reviewed." : "Order approved."));
      await loadPendingOrders();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update approval status.");
    } finally {
      setUpdatingApproval(false);
    }
  };

  return (
    <RoleGate allowedRoles={["admin", "technician"]}>
      <PageHeader title="Result Entry" description="Capture outcomes, progress orders through review, and release only governed results." />

      <SurfaceSection
        eyebrow="Workflow selection"
        title="Choose active order"
        description="Select the next order in the execution queue and keep its status, approval state, and referral context visible while entering results."
        className="mb-5"
      >
        <SearchableSelect
          label="Select order"
          value={selectedOrderId}
          onChange={setSelectedOrderId}
          options={orderOptions}
          placeholder={orders.length === 0 ? "No orders available" : "Select order"}
          searchPlaceholder="Search order or patient"
          emptyMessage="No matching orders."
          disabled={loading || orders.length === 0}
        />
        {selectedOrder ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone={selectedOrder.status === "completed" ? "good" : selectedOrder.status === "in_progress" ? "info" : "warn"}>
              Order {selectedOrder.status}
            </StatusBadge>
            <StatusBadge tone={selectedOrder.approval_status === "approved" ? "good" : selectedOrder.approval_status === "reviewed" ? "info" : "neutral"}>
              Approval {selectedOrder.approval_status}
            </StatusBadge>
            {selectedOrder.referring_doctor_name ? <StatusBadge tone="neutral">Ref. Dr {selectedOrder.referring_doctor_name}</StatusBadge> : null}
          </div>
        ) : null}
      </SurfaceSection>

      {loading ? <p className="text-sm text-slate-400">Loading pending orders...</p> : null}
      {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}
      {success ? <p className={`mb-3 ${successTextClassName}`}>{success}</p> : null}

      {selectedOrder ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {selectedOrder.tests.map((test) => {
            const path = watch(test.test_id);
            return (
              <div
                key={test.test_id}
                className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
              >
                <p className="text-xl font-semibold tracking-[-0.03em] text-slate-50">{test.test_name}</p>
                <p className="mb-4 mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Normal range: {test.normal_range}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    <span className={fieldLabelClassName}>Result value</span>
                    <input
                      {...register(`${test.test_id}.result_value`)}
                      placeholder="Result value"
                      className={inputClassName}
                    />
                  </label>
                  <label>
                    <span className={fieldLabelClassName}>Remarks</span>
                    <input
                      {...register(`${test.test_id}.remarks`)}
                      placeholder="Remarks (optional)"
                      className={inputClassName}
                    />
                  </label>
                </div>
                {!path?.result_value ? (
                  <p className={helperTextClassName}>Enter result value to complete this test.</p>
                ) : null}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={saving}
            className={primaryButtonClassName}
          >
            {saving ? "Saving..." : "Save Results"}
          </button>
          {role === "admin" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={updatingApproval || selectedOrder.approval_status === "reviewed" || selectedOrder.approval_status === "approved"}
                onClick={() => void updateApprovalStatus("reviewed")}
                className={compactAccentButtonClassName}
              >
                {updatingApproval ? "Updating..." : "Mark Reviewed"}
              </button>
              <button
                type="button"
                disabled={updatingApproval || selectedOrder.approval_status === "approved" || selectedOrder.status !== "completed"}
                onClick={() => void updateApprovalStatus("approved")}
                className={compactButtonClassName}
              >
                {updatingApproval ? "Updating..." : "Approve Report"}
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        !loading && <p className="text-sm text-slate-400">No orders available for results workflow.</p>
      )}
    </RoleGate>
  );
}
