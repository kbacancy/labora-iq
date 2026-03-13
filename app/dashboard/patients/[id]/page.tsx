"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { patientSchema } from "@/src/lib/validation";
import {
  SurfaceSection,
  compactButtonClassName,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/src/components/ui/surface";
import type { Patient } from "@/src/types/database";

type PatientValues = {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
};

export default function EditPatientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<PatientValues>();

  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) {
        setError("Missing patient ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single<Patient>();

      if (queryError || !data) {
        setError(queryError?.message ?? "Unable to load patient.");
        setLoading(false);
        return;
      }

      reset({
        name: data.name,
        age: data.age,
        gender: data.gender as PatientValues["gender"],
        phone: data.phone,
      });
      setLoading(false);
    };

    void loadPatient();
  }, [patientId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = patientSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    if (!patientId) {
      setError("Missing patient ID.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetchWithAccessToken(`/api/patients/${patientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "update_details",
          data: parsed.data,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setSubmitting(false);

      if (!response.ok) {
        setError(payload.error ?? "Unable to update patient.");
        return;
      }

      router.replace("/dashboard/patients?refresh=1&toast=updated");
    } catch (error) {
      setSubmitting(false);
      setError(error instanceof Error ? error.message : "Unable to update patient.");
    }
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Edit Patient" description="Update patient details while keeping the record aligned with downstream lab workflow." />
      {loading ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] p-6 text-sm text-slate-400">
          Loading patient...
        </div>
      ) : (
        <SurfaceSection eyebrow="Patient record" title="Update profile" description="Adjust the demographic record without leaving the governed patient ledger." className="max-w-3xl">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className={fieldLabelClassName}>Name</span>
                <input {...register("name")} className={inputClassName} />
              </label>
              <label>
                <span className={fieldLabelClassName}>Age</span>
                <input type="number" {...register("age")} className={inputClassName} />
              </label>
              <label>
                <span className={fieldLabelClassName}>Gender</span>
                <select {...register("gender")} className={selectClassName}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span className={fieldLabelClassName}>Phone</span>
                <input {...register("phone")} className={inputClassName} />
              </label>
            </div>

            {error ? <p className={errorTextClassName}>{error}</p> : null}

            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className={primaryButtonClassName}>
                {submitting ? "Saving..." : "Update Patient"}
              </button>
              <button type="button" onClick={() => router.replace("/dashboard/patients")} className={compactButtonClassName}>
                Cancel
              </button>
            </div>
          </form>
        </SurfaceSection>
      )}
    </RoleGate>
  );
}
