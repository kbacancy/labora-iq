"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { createAuditLog } from "@/src/lib/audit";
import { createNotification } from "@/src/lib/notifications";
import { formatDate } from "@/src/lib/format";
import type { Sample } from "@/src/types/database";

const statuses: Sample["status"][] = ["collected", "received", "in_testing", "completed", "reported"];

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAuth();
  const [sample, setSample] = useState<Sample | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: sampleRow, error: sampleError }, { data: techRows }] = await Promise.all([
      supabase.from("samples").select("*").eq("id", id).single(),
      supabase.from("profiles").select("id,full_name").eq("role", "technician").order("full_name", { ascending: true }),
    ]);

    if (sampleError) {
      setError(sampleError.message);
      setSample(null);
      setLoading(false);
      return;
    }

    setSample(sampleRow as Sample);
    setTechnicians(techRows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const updateSample = async (updates: Partial<Pick<Sample, "status" | "technician_id">>) => {
    if (!sample) {
      return;
    }

    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("samples").update(updates).eq("id", sample.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await createAuditLog({
      userId: user?.id ?? null,
      action: updates.status ? "sample_status_updated" : "sample_technician_updated",
      tableName: "samples",
      recordId: sample.id,
    });

    if (updates.status) {
      await createNotification({
        recipientRole: "admin",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sample.sample_code} moved to ${updates.status}.`,
        entityType: "samples",
        entityId: sample.id,
        createdBy: user?.id ?? null,
      });
      await createNotification({
        recipientRole: "receptionist",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sample.sample_code} moved to ${updates.status}.`,
        entityType: "samples",
        entityId: sample.id,
        createdBy: user?.id ?? null,
      });
    }

    if (updates.technician_id) {
      await createNotification({
        recipientUserId: updates.technician_id,
        type: "sample_assigned",
        title: "Sample Assigned",
        message: `You were assigned sample ${sample.sample_code}.`,
        entityType: "samples",
        entityId: sample.id,
        createdBy: user?.id ?? null,
      });
    }

    await loadData();
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Sample Detail" description="View and manage lifecycle for a single sample." />

      {loading ? <p className="text-sm text-gray-400">Loading sample...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      {sample ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-lg font-medium">Overview</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-300">
              <p>Sample Code: <span className="text-gray-100">{sample.sample_code}</span></p>
              <p>Patient: <span className="text-gray-100">{sample.patient_name}</span></p>
              <p>Test Type: <span className="text-gray-100">{sample.test_type}</span></p>
              <p>Created: <span className="text-gray-100">{formatDate(sample.created_at)}</span></p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-lg font-medium">Actions</h2>
            <div className="mt-3 space-y-3">
              {(role === "admin" || role === "technician") ? (
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Status</label>
                  <select
                    value={sample.status}
                    onChange={(event) => void updateSample({ status: event.target.value as Sample["status"] })}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm capitalize"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {(role === "admin" || role === "receptionist") ? (
                <div>
                  <label className="mb-1 block text-sm text-gray-300">Assigned Technician</label>
                  <select
                    value={sample.technician_id ?? ""}
                    onChange={(event) => void updateSample({ technician_id: event.target.value || null })}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </RoleGate>
  );
}
