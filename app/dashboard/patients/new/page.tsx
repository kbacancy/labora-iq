"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

const patientSchema = z.object({
  name: z.string().min(2, "Name is required."),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(7, "Phone is required."),
});

type PatientValues = z.infer<typeof patientSchema>;

export default function NewPatientPage() {
  const router = useRouter();
  const { user } = useAuth();
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
    const withCreator = await supabase.from("patients").insert({
      ...parsed.data,
      created_by: user?.id ?? null,
    });

    const isCreatedByMissing = Boolean(
      withCreator.error?.message?.includes("created_by") &&
        withCreator.error?.message?.includes("does not exist")
    );

    const withoutCreator = isCreatedByMissing
      ? await supabase.from("patients").insert(parsed.data)
      : null;

    const insertError = withoutCreator?.error ?? withCreator.error;
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.replace("/dashboard/patients?refresh=1&toast=created");
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Add Patient" description="Create a new patient profile." />
      <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Name</label>
          <input {...register("name")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Age</label>
          <input type="number" {...register("age")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Gender</label>
          <select {...register("gender")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm">
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Phone</label>
          <input {...register("phone")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>

        {(error || formState.errors.name?.message) && (
          <p className="text-sm text-red-400">{error ?? formState.errors.name?.message}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Patient"}
        </button>
      </form>
    </RoleGate>
  );
}
