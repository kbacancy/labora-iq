"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency } from "@/src/lib/format";
import { createNotification } from "@/src/lib/notifications";
import type { LabTest, Patient } from "@/src/types/database";

const orderSchema = z.object({
  patient_id: z.string().uuid("Please select a patient."),
  test_ids: z.array(z.string().uuid()).min(1, "Select at least one test."),
});

type OrderValues = {
  patient_id: string;
  assigned_to?: string;
  referring_doctor_name?: string;
};

export default function NewOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch } = useForm<OrderValues>();

  const selectedPatientId = watch("patient_id");
  const selectedTechnicianId = watch("assigned_to");

  useEffect(() => {
    const loadData = async () => {
      const [{ data: patientRows }, { data: testRows }, { data: technicianRows }] = await Promise.all([
        supabase.from("patients").select("*").order("name", { ascending: true }),
        supabase.from("tests").select("*").order("test_name", { ascending: true }),
        supabase.from("profiles").select("id,full_name").eq("role", "technician").order("full_name", { ascending: true }),
      ]);
      setPatients(patientRows ?? []);
      setTests(testRows ?? []);
      setTechnicians(technicianRows ?? []);
    };
    loadData();
  }, []);

  const totalPrice = useMemo(
    () =>
      tests
        .filter((test) => selectedTests.includes(test.id))
        .reduce((sum, test) => sum + Number(test.price ?? 0), 0),
    [selectedTests, tests]
  );

  const toggleTest = (testId: string) => {
    setSelectedTests((current) => (current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId]));
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = orderSchema.safeParse({ patient_id: values.patient_id, test_ids: selectedTests });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid payload.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const withCreator = await supabase
      .from("lab_orders")
      .insert({
        patient_id: parsed.data.patient_id,
        total_price: totalPrice,
        status: "pending",
        approval_status: "draft",
        created_by: user?.id ?? null,
        assigned_to: values.assigned_to || null,
        referring_doctor_name: values.referring_doctor_name?.trim() || null,
      })
      .select("id")
      .single();

    const isCreatedByMissing = Boolean(
      withCreator.error?.message?.includes("created_by") &&
        withCreator.error?.message?.includes("does not exist")
    );
    const isTotalPriceMissing = Boolean(
      withCreator.error?.message?.includes("total_price") &&
        withCreator.error?.message?.includes("does not exist")
    );

    const withoutCreator = isCreatedByMissing || isTotalPriceMissing
      ? await supabase
          .from("lab_orders")
          .insert({
            patient_id: parsed.data.patient_id,
            ...(isTotalPriceMissing ? {} : { total_price: totalPrice }),
            status: "pending",
            approval_status: "draft",
            assigned_to: values.assigned_to || null,
            referring_doctor_name: values.referring_doctor_name?.trim() || null,
          })
          .select("id")
          .single()
      : null;

    const orderRow = withoutCreator?.data ?? withCreator.data;
    const orderError = withoutCreator?.error ?? withCreator.error;

    if (orderError || !orderRow) {
      setSubmitting(false);
      setError(orderError?.message ?? "Unable to create order.");
      return;
    }

    const orderTestsPayload = parsed.data.test_ids.map((testId) => ({
      order_id: orderRow.id,
      test_id: testId,
    }));

    const { error: orderTestsError } = await supabase.from("order_tests").insert(orderTestsPayload);
    setSubmitting(false);

    if (orderTestsError) {
      setError(orderTestsError.message);
      return;
    }

    if (values.assigned_to) {
      await createNotification({
        recipientUserId: values.assigned_to,
        type: "order_assigned",
        title: "New Order Assigned",
        message: `Order ${orderRow.id.slice(0, 8)} has been assigned to you.`,
        entityType: "lab_orders",
        entityId: orderRow.id,
        createdBy: user?.id ?? null,
      });
    }

    await createNotification({
      recipientRole: "admin",
      type: "order_created",
      title: "Order Created",
      message: `A new order ${orderRow.id.slice(0, 8)} has been created.`,
      entityType: "lab_orders",
      entityId: orderRow.id,
      createdBy: user?.id ?? null,
    });

    router.replace("/dashboard/orders");
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Create Order" description="Create lab order by selecting patient and tests." />
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <label className="mb-1 block text-sm text-gray-300">Patient</label>
          <select {...register("patient_id")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm">
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.phone})
              </option>
            ))}
          </select>
          {selectedPatientId ? (
            <p className="mt-2 text-xs text-gray-400">Selected patient ID: {selectedPatientId}</p>
          ) : null}
          <label className="mb-1 mt-4 block text-sm text-gray-300">Assign Technician (optional)</label>
          <select
            {...register("assigned_to")}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          >
            <option value="">Unassigned (pending pool)</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.full_name}
              </option>
            ))}
          </select>
          {selectedTechnicianId ? (
            <p className="mt-2 text-xs text-gray-400">Assigned technician ID: {selectedTechnicianId}</p>
          ) : null}
          <label className="mb-1 mt-4 block text-sm text-gray-300">Referring Doctor (optional)</label>
          <input
            {...register("referring_doctor_name")}
            placeholder="Dr. Name"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="mb-3 text-sm text-gray-300">Tests</p>
          {tests.length === 0 ? (
            <p className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-sm text-amber-300">
              No tests available in catalog. Ask admin to add tests from <span className="font-medium">Tests</span>.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {tests.map((test) => (
                <label key={test.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-800 px-3 py-2 hover:border-gray-700">
                  <span className="text-sm text-gray-200">{test.test_name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatCurrency(Number(test.price))}</span>
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 accent-indigo-500"
                    />
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-4 text-sm text-gray-300">
            Total Price: <span className="font-semibold text-indigo-300">{formatCurrency(totalPrice)}</span>
          </p>
        </section>

        <section className="lg:col-span-2">
          {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Order"}
          </button>
        </section>
      </form>
    </RoleGate>
  );
}
