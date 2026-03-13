"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import {
  SurfaceSection,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { Sample } from "@/src/types/database";

interface SampleView extends Sample {
  technician_name?: string | null;
}

const sampleStatuses: Sample["status"][] = ["collected", "received", "in_testing", "completed", "reported"];

export default function SamplesPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const { role, user } = useAuth();
  const [samples, setSamples] = useState<SampleView[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalSamples, setTotalSamples] = useState(0);
  const [form, setForm] = useState({
    patient_id: "",
    test_type: "",
    technician_id: "",
  });
  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: patient.name,
    description: patient.phone,
    keywords: [patient.phone],
  }));
  const technicianOptions = technicians.map((technician) => ({
    value: technician.id,
    label: technician.full_name,
  }));

  const loadDependencies = useCallback(async () => {
    const [{ data: patientRows }, { data: technicianRows }] = await Promise.all([
      supabase.from("patients").select("id,name,phone").order("name", { ascending: true }),
      supabase.from("profiles").select("id,full_name").eq("role", "technician").order("full_name", { ascending: true }),
    ]);
    setPatients(patientRows ?? []);
    setTechnicians(technicianRows ?? []);
  }, []);

  const loadSamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("samples")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (role === "technician") {
      query = query.or(`technician_id.eq.${user?.id ?? ""},technician_id.is.null`);
    }

    const { data, error: queryError, count } = await query;
    if (queryError) {
      setError(queryError.message);
      setSamples([]);
      setTotalSamples(0);
      setLoading(false);
      return;
    }

    const technicianMap = new Map(technicians.map((item) => [item.id, item.full_name]));
    const mapped = (data ?? []).map((sample) => ({
      ...sample,
      technician_name: sample.technician_id ? technicianMap.get(sample.technician_id) ?? "-" : null,
    })) as SampleView[];

    setSamples(mapped);
    setTotalSamples(count ?? 0);
    setLoading(false);
  }, [page, pageSize, role, technicians, user?.id]);

  useEffect(() => {
    void loadDependencies();
  }, [loadDependencies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSamples();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSamples]);

  const createSample = async () => {
    if (!form.patient_id || !form.test_type.trim()) {
      setError("Patient and test type are required.");
      return;
    }

    setCreating(true);
    setError(null);

    if (!patients.some((item) => item.id === form.patient_id)) {
      setCreating(false);
      setError("Invalid patient selected.");
      return;
    }

    try {
      const response = await fetchWithAccessToken("/api/workflow/samples", {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          test_type: form.test_type.trim(),
          technician_id: form.technician_id || "",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to create sample.");
        return;
      }

      setForm({ patient_id: "", test_type: "", technician_id: "" });
      if (page !== 1) {
        setPage(1);
      } else {
        await loadSamples();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create sample.");
    } finally {
      setCreating(false);
    }
  };

  const updateSample = async (sampleId: string, updates: Partial<Pick<Sample, "status" | "technician_id">>) => {
    setError(null);
    try {
      const response = await fetchWithAccessToken(`/api/workflow/samples/${sampleId}`, {
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

      await loadSamples();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update sample.");
    }
  };

  return (
    <RoleGate allowedRoles={["admin", "receptionist", "technician"]}>
      <PageHeader title="Samples" description="Track collection, technician routing, and lifecycle status across the active sample queue." />

      {(role === "admin" || role === "receptionist") ? (
        <SurfaceSection
          eyebrow="Specimen intake"
          title="Create sample"
          description="Register a fresh sample, attach it to the patient record, and optionally assign execution ownership."
          className="mb-5"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <SearchableSelect
                label="Patient"
                value={form.patient_id}
                onChange={(nextValue) => setForm((current) => ({ ...current, patient_id: nextValue }))}
                options={patientOptions}
                placeholder="Select patient"
                searchPlaceholder="Search patient"
                emptyMessage="No matching patients."
              />
            </label>
            <label>
              <span className={fieldLabelClassName}>Test type</span>
              <input
                value={form.test_type}
                onChange={(event) => setForm((current) => ({ ...current, test_type: event.target.value }))}
                placeholder="Test type (e.g. CBC, LFT)"
                className={inputClassName}
              />
            </label>
            <label>
              <SearchableSelect
                label="Assign technician"
                value={form.technician_id}
                onChange={(nextValue) => setForm((current) => ({ ...current, technician_id: nextValue }))}
                options={technicianOptions}
                placeholder="Assign technician (optional)"
                searchPlaceholder="Search technician"
                emptyMessage="No technicians found."
              />
            </label>
          </div>
          <button type="button" onClick={() => void createSample()} disabled={creating} className={`mt-5 ${primaryButtonClassName}`}>
            {creating ? "Creating..." : "Create Sample"}
          </button>
        </SurfaceSection>
      ) : null}

      {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Sample Code</th>
              <th className={tableHeaderCellClassName}>Patient</th>
              <th className={tableHeaderCellClassName}>Test Type</th>
              <th className={tableHeaderCellClassName}>Technician</th>
              <th className={tableHeaderCellClassName}>Status</th>
              <th className={tableHeaderCellClassName}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading samples...
                </td>
              </tr>
            ) : samples.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No samples found.
                </td>
              </tr>
            ) : (
              samples.map((sample) => (
                <tr key={sample.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>
                    <Link href={`/dashboard/samples/${sample.id}`} className="text-blue-300 hover:text-blue-200">
                      {sample.sample_code}
                    </Link>
                  </td>
                  <td className={tableCellClassName}>{sample.patient_name}</td>
                  <td className={tableCellClassName}>{sample.test_type}</td>
                  <td className={tableCellClassName}>
                    {(role === "admin" || role === "receptionist") ? (
                      <select
                        value={sample.technician_id ?? ""}
                        onChange={(event) =>
                          void updateSample(sample.id, { technician_id: event.target.value || null })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-xs text-slate-100"
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
                  <td className={tableCellClassName}>
                    {(role === "admin" || role === "technician") ? (
                      <select
                        value={sample.status}
                        onChange={(event) =>
                          void updateSample(sample.id, { status: event.target.value as Sample["status"] })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-xs capitalize text-slate-100"
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
                  <td className={tableMutedCellClassName}>{formatDate(sample.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalSamples > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalSamples}
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
