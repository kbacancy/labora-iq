"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency } from "@/src/lib/format";
import { createNotification } from "@/src/lib/notifications";
import { createOrderSchema } from "@/src/lib/validation";
import {
  SurfaceSection,
  StatusBadge,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/src/components/ui/surface";
import type { LabTest, Patient } from "@/src/types/database";

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
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { control, register, handleSubmit } = useForm<OrderValues>();

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        value: patient.id,
        label: patient.name,
        description: patient.phone,
        keywords: [patient.phone],
      })),
    [patients]
  );
  const technicianOptions = useMemo(
    () =>
      technicians.map((technician) => ({
        value: technician.id,
        label: technician.full_name,
      })),
    [technicians]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [
          { data: patientRows, error: patientError },
          { data: testRows, error: testError },
          { data: technicianRows, error: technicianError },
        ] = await Promise.all([
          supabase.from("patients").select("*").order("name", { ascending: true }),
          supabase.from("tests").select("*").order("test_name", { ascending: true }),
          supabase.from("profiles").select("id,full_name").eq("role", "technician").order("full_name", { ascending: true }),
        ]);

        const firstError = patientError ?? testError ?? technicianError;
        if (firstError) {
          setError(firstError.message);
          setPatients([]);
          setTests([]);
          setTechnicians([]);
          return;
        }

        setPatients(patientRows ?? []);
        setTests(testRows ?? []);
        setTechnicians(technicianRows ?? []);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to load order setup data.");
        setPatients([]);
        setTests([]);
        setTechnicians([]);
      } finally {
        setLoadingData(false);
      }
    };
    void loadData();
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
    const parsed = createOrderSchema.safeParse({
      patient_id: values.patient_id,
      test_ids: selectedTests,
      assigned_to: values.assigned_to,
      referring_doctor_name: values.referring_doctor_name,
    });
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
        assigned_to: parsed.data.assigned_to ?? null,
        referring_doctor_name: parsed.data.referring_doctor_name ?? null,
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
            assigned_to: parsed.data.assigned_to ?? null,
            referring_doctor_name: parsed.data.referring_doctor_name ?? null,
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

    const selectedPatient = patients.find((patient) => patient.id === parsed.data.patient_id);
    const orderSubject = selectedPatient?.name ? `for ${selectedPatient.name}` : "for a patient";

    if (parsed.data.assigned_to) {
      await createNotification({
        recipientUserId: parsed.data.assigned_to,
        type: "order_assigned",
        title: "New Order Assigned",
        message: `A new order ${orderSubject} has been assigned to you.`,
        entityType: "lab_orders",
        entityId: orderRow.id,
        actionUrl: `/dashboard/results?orderId=${orderRow.id}`,
        createdBy: user?.id ?? null,
      });
    }

    await createNotification({
      recipientRole: "admin",
      type: "order_created",
      title: "Order Created",
      message: `A new order has been created ${orderSubject}.`,
      entityType: "lab_orders",
      entityId: orderRow.id,
      actionUrl: "/dashboard/orders",
      createdBy: user?.id ?? null,
    });

    router.replace("/dashboard/orders");
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Create Order" description="Assemble the patient request, route execution ownership, and price the release package in one flow." />
      {loadingData ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] px-6 py-5 text-sm text-slate-400 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
          Loading order setup data...
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <SurfaceSection eyebrow="Order composition" title="Request details" description="Select the patient, technician routing, and referral context before releasing the order into the queue.">
          <div className="space-y-4">
            <Controller
              control={control}
              name="patient_id"
              defaultValue=""
              render={({ field }) => (
                <SearchableSelect
                  label="Patient"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={patientOptions}
                  placeholder="Select patient"
                  searchPlaceholder="Search patient by name or phone"
                emptyMessage="No matching patients."
              />
            )}
          />
            <Controller
              control={control}
              name="assigned_to"
              defaultValue=""
              render={({ field }) => (
                <SearchableSelect
                  label="Assign technician"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={technicianOptions}
                  placeholder="Select technician (optional)"
                  searchPlaceholder="Search technician"
                emptyMessage="No technicians found."
              />
            )}
          />
            <label>
              <span className={fieldLabelClassName}>Referring doctor</span>
              <input {...register("referring_doctor_name")} placeholder="Dr. Name" className={inputClassName} />
            </label>
          </div>
        </SurfaceSection>

        <SurfaceSection eyebrow="Diagnostic bundle" title="Select tests" description="Choose the test set that defines the execution scope and total release value.">
          {tests.length === 0 ? (
            <p className="rounded-2xl border border-amber-900/40 bg-amber-950/10 px-4 py-4 text-sm text-amber-300">
              No tests available in catalog. Ask an admin to load the starter catalog or add tests from <span className="font-medium">Tests</span>.
            </p>
          ) : (
            <div className="scrollbar-panel max-h-72 space-y-2 overflow-auto pr-1">
              {tests.map((test) => (
                <label key={test.id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition hover:border-slate-700">
                  <span className="text-sm text-slate-200">{test.test_name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{formatCurrency(Number(test.price))}</span>
                    <Checkbox
                      checked={selectedTests.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      ariaLabel={`Select ${test.test_name}`}
                    />
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <StatusBadge tone="info">Selected {selectedTests.length}</StatusBadge>
            <p className="text-sm text-slate-300">
              Total Price: <span className="font-semibold text-blue-300">{formatCurrency(totalPrice)}</span>
            </p>
          </div>
        </SurfaceSection>

        <section className="lg:col-span-2">
          {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}
          <button type="submit" disabled={submitting} className={primaryButtonClassName}>
            {submitting ? "Creating..." : "Create Order"}
          </button>
        </section>
      </form>
    </RoleGate>
  );
}
