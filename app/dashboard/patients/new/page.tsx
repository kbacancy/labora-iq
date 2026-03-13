"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { patientSchema } from "@/src/lib/validation";
import {
  SurfaceSection,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/src/components/ui/surface";

type PatientValues = {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
};

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState } = useForm<PatientValues>();

  const onSubmit = handleSubmit(async (values) => {
    const parsed = patientSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetchWithAccessToken("/api/patients", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setSubmitting(false);

      if (!response.ok) {
        setError(payload.error ?? "Unable to create patient.");
        return;
      }

      router.replace("/dashboard/patients?refresh=1&toast=created");
    } catch (error) {
      setSubmitting(false);
      setError(error instanceof Error ? error.message : "Unable to create patient.");
    }
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Add Patient" description="Create a new patient profile and stage the record for intake into the workflow." />
      <SurfaceSection eyebrow="Patient intake" title="Create patient profile" description="Capture the core demographic record before routing the patient into orders, samples, and result execution." className="max-w-3xl">
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

          {(error || formState.errors.name?.message) && <p className={errorTextClassName}>{error ?? formState.errors.name?.message}</p>}

          <button type="submit" disabled={submitting} className={primaryButtonClassName}>
            {submitting ? "Saving..." : "Save Patient"}
          </button>
        </form>
      </SurfaceSection>
    </RoleGate>
  );
}
