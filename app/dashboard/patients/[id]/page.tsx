"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";
import type { Patient } from "@/src/types/database";

const patientSchema = z.object({
  name: z.string().min(2, "Name is required."),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(7, "Phone is required."),
});

type PatientValues = z.infer<typeof patientSchema>;

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
    const { error: updateError } = await supabase.from("patients").update(parsed.data).eq("id", patientId);
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/dashboard/patients?refresh=1&toast=updated");
  });

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      <PageHeader title="Edit Patient" description="Update patient details and demographics." />
      {loading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">Loading patient...</div>
      ) : (
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

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Update Patient"}
            </button>
            <button
              type="button"
              onClick={() => router.replace("/dashboard/patients")}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-indigo-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </RoleGate>
  );
}
