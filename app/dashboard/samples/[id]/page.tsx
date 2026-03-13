"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import {
  SurfaceSection,
  StatusBadge,
  errorTextClassName,
  fieldLabelClassName,
  selectClassName,
} from "@/src/components/ui/surface";
import type { Sample } from "@/src/types/database";

const statuses: Sample["status"][] = ["collected", "received", "in_testing", "completed", "reported"];

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [sample, setSample] = useState<Sample | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const technicianOptions = technicians.map((technician) => ({
    value: technician.id,
    label: technician.full_name,
  }));

  const loadData = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const updateSample = async (updates: Partial<Pick<Sample, "status" | "technician_id">>) => {
    if (!sample) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetchWithAccessToken(`/api/workflow/samples/${sample.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          updates.status
            ? { action: "set_status", status: updates.status }
            : { action: "set_technician", technician_id: updates.technician_id || "" }
        ),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to update sample.");
        return;
      }

      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update sample.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Sample Detail" description="Inspect a single specimen, monitor its progress, and adjust routing or lifecycle state." />

      {loading ? <p className="text-sm text-slate-400">Loading sample...</p> : null}
      {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}

      {sample ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SurfaceSection eyebrow="Sample overview" title="Lifecycle snapshot" description="Keep the specimen identity and current processing context visible while making updates.">
            <div className="space-y-3 text-sm text-slate-300">
              <p>Sample Code: <span className="text-slate-100">{sample.sample_code}</span></p>
              <p>Patient: <span className="text-slate-100">{sample.patient_name}</span></p>
              <p>Test Type: <span className="text-slate-100">{sample.test_type}</span></p>
              <p>Created: <span className="text-slate-100">{formatDate(sample.created_at)}</span></p>
              <StatusBadge tone="info" className="mt-2">{sample.status}</StatusBadge>
            </div>
          </SurfaceSection>

          <SurfaceSection eyebrow="Execution controls" title="Actions" description="Change sample lifecycle stage or technician ownership with governed actions.">
            <div className="space-y-4">
              {(role === "admin" || role === "technician") ? (
                <label>
                  <span className={fieldLabelClassName}>Status</span>
                  <select
                    value={sample.status}
                    onChange={(event) => void updateSample({ status: event.target.value as Sample["status"] })}
                    disabled={saving}
                    className={`${selectClassName} capitalize`}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {(role === "admin" || role === "receptionist") ? (
                <SearchableSelect
                  label="Assigned Technician"
                  value={sample.technician_id ?? ""}
                  onChange={(nextValue) => void updateSample({ technician_id: nextValue || null })}
                  disabled={saving}
                  options={technicianOptions}
                  placeholder="Unassigned"
                  searchPlaceholder="Search technician"
                  emptyMessage="No technicians found."
                />
              ) : null}
            </div>
          </SurfaceSection>
        </div>
      ) : null}
    </RoleGate>
  );
}
