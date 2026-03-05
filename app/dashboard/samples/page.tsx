"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { createAuditLog } from "@/src/lib/audit";
import { generateSampleCode } from "@/src/lib/samples";
import { createNotification } from "@/src/lib/notifications";
import { formatDate } from "@/src/lib/format";
import type { Sample } from "@/src/types/database";

interface SampleView extends Sample {
  technician_name?: string | null;
}

const sampleStatuses: Sample["status"][] = ["collected", "received", "in_testing", "completed", "reported"];

export default function SamplesPage() {
  const { role, user } = useAuth();
  const [samples, setSamples] = useState<SampleView[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    test_type: "",
    technician_id: "",
  });

  const loadDependencies = async () => {
    const [{ data: patientRows }, { data: technicianRows }] = await Promise.all([
      supabase.from("patients").select("id,name").order("name", { ascending: true }),
      supabase.from("profiles").select("id,full_name").eq("role", "technician").order("full_name", { ascending: true }),
    ]);
    setPatients(patientRows ?? []);
    setTechnicians(technicianRows ?? []);
  };

  const loadSamples = async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from("samples").select("*").order("created_at", { ascending: false });
    if (role === "technician") {
      query = query.or(`technician_id.eq.${user?.id ?? ""},technician_id.is.null`);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setSamples([]);
      setLoading(false);
      return;
    }

    const technicianMap = new Map(technicians.map((item) => [item.id, item.full_name]));
    const mapped = (data ?? []).map((sample) => ({
      ...sample,
      technician_name: sample.technician_id ? technicianMap.get(sample.technician_id) ?? "-" : null,
    })) as SampleView[];

    setSamples(mapped);
    setLoading(false);
  };

  useEffect(() => {
    const run = async () => {
      await loadDependencies();
    };
    void run();
  }, []);

  useEffect(() => {
    void loadSamples();
  }, [role, user?.id, technicians.length]);

  const createSample = async () => {
    if (!form.patient_id || !form.test_type.trim()) {
      setError("Patient and test type are required.");
      return;
    }

    setCreating(true);
    setError(null);

    const selectedPatient = patients.find((item) => item.id === form.patient_id);
    if (!selectedPatient) {
      setCreating(false);
      setError("Invalid patient selected.");
      return;
    }

    let insertedId: string | null = null;
    let attempts = 0;

    while (!insertedId && attempts < 5) {
      attempts += 1;
      const sampleCode = generateSampleCode();
      const { data: inserted, error: insertError } = await supabase
        .from("samples")
        .insert({
          sample_code: sampleCode,
          patient_id: form.patient_id,
          patient_name: selectedPatient.name,
          test_type: form.test_type.trim(),
          technician_id: form.technician_id || null,
          status: "collected",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (!insertError && inserted?.id) {
        insertedId = inserted.id;
        break;
      }

      if (insertError && !insertError.message.includes("duplicate key")) {
        setCreating(false);
        setError(insertError.message);
        return;
      }
    }

    setCreating(false);

    if (!insertedId) {
      setError("Failed to generate unique sample code. Please retry.");
      return;
    }

    await createAuditLog({
      userId: user?.id ?? null,
      action: "sample_created",
      tableName: "samples",
      recordId: insertedId,
    });

    if (form.technician_id) {
      await createNotification({
        recipientUserId: form.technician_id,
        type: "sample_assigned",
        title: "New Sample Assigned",
        message: `Sample ${insertedId.slice(0, 8)} has been assigned to you for ${form.test_type.trim()}.`,
        entityType: "samples",
        entityId: insertedId,
        createdBy: user?.id ?? null,
      });
    }

    await createNotification({
      recipientRole: "admin",
      type: "sample_created",
      title: "Sample Created",
      message: `A new sample has been created for patient ${selectedPatient.name}.`,
      entityType: "samples",
      entityId: insertedId,
      createdBy: user?.id ?? null,
    });

    setForm({ patient_id: "", test_type: "", technician_id: "" });
    await loadSamples();
  };

  const updateSample = async (sampleId: string, updates: Partial<Pick<Sample, "status" | "technician_id">>) => {
    setError(null);
    const { error: updateError } = await supabase.from("samples").update(updates).eq("id", sampleId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await createAuditLog({
      userId: user?.id ?? null,
      action: updates.status ? "sample_status_updated" : "sample_technician_updated",
      tableName: "samples",
      recordId: sampleId,
    });

    if (updates.status) {
      await createNotification({
        recipientRole: "admin",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sampleId.slice(0, 8)} moved to ${updates.status}.`,
        entityType: "samples",
        entityId: sampleId,
        createdBy: user?.id ?? null,
      });
      await createNotification({
        recipientRole: "receptionist",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sampleId.slice(0, 8)} moved to ${updates.status}.`,
        entityType: "samples",
        entityId: sampleId,
        createdBy: user?.id ?? null,
      });
    }

    if (updates.technician_id) {
      await createNotification({
        recipientUserId: updates.technician_id,
        type: "sample_assigned",
        title: "Sample Assigned",
        message: `You were assigned sample ${sampleId.slice(0, 8)}.`,
        entityType: "samples",
        entityId: sampleId,
        createdBy: user?.id ?? null,
      });
    }

    await loadSamples();
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Samples" description="Track sample lifecycle, assignment, and testing progress." />

      {(role === "admin" || role === "receptionist") ? (
        <section className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-lg font-medium">Create Sample</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select
              value={form.patient_id}
              onChange={(event) => setForm((current) => ({ ...current, patient_id: event.target.value }))}
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            <input
              value={form.test_type}
              onChange={(event) => setForm((current) => ({ ...current, test_type: event.target.value }))}
              placeholder="Test type (e.g. CBC, LFT)"
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
            <select
              value={form.technician_id}
              onChange={(event) => setForm((current) => ({ ...current, technician_id: event.target.value }))}
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            >
              <option value="">Assign technician (optional)</option>
              {technicians.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void createSample()}
            disabled={creating}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Sample"}
          </button>
        </section>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Sample Code</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Test Type</th>
              <th className="px-4 py-3 font-medium">Technician</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading samples...
                </td>
              </tr>
            ) : samples.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No samples found.
                </td>
              </tr>
            ) : (
              samples.map((sample) => (
                <tr key={sample.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/samples/${sample.id}`} className="text-indigo-300 hover:text-indigo-200">
                      {sample.sample_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{sample.patient_name}</td>
                  <td className="px-4 py-3">{sample.test_type}</td>
                  <td className="px-4 py-3">
                    {(role === "admin" || role === "receptionist") ? (
                      <select
                        value={sample.technician_id ?? ""}
                        onChange={(event) =>
                          void updateSample(sample.id, { technician_id: event.target.value || null })
                        }
                        className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {technicians.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{sample.technician_name ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(role === "admin" || role === "technician") ? (
                      <select
                        value={sample.status}
                        onChange={(event) =>
                          void updateSample(sample.id, { status: event.target.value as Sample["status"] })
                        }
                        className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs capitalize"
                      >
                        {sampleStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="capitalize">{sample.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(sample.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
