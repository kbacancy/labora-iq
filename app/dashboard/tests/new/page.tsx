"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";

const testSchema = z.object({
  test_name: z.string().min(2, "Test name is required."),
  category: z.string().optional(),
  price: z.coerce.number().positive("Price must be greater than 0."),
  normal_range: z.string().min(1, "Normal range is required."),
  reference_range: z.string().optional(),
  units: z.string().optional(),
});

type TestValues = z.infer<typeof testSchema>;

export default function NewTestPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<TestValues>();

  const onSubmit = handleSubmit(async (values) => {
    const parsed = testSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase.from("tests").insert(parsed.data);
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.replace("/dashboard/tests");
  });

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader title="Add Test" description="Create a test in catalog." />
      <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Test Name</label>
          <input {...register("test_name")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Category</label>
          <input {...register("category")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Price</label>
          <input type="number" step="0.01" {...register("price")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Normal Range</label>
          <input {...register("normal_range")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Reference Range</label>
          <input {...register("reference_range")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Units</label>
          <input {...register("units")} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm" />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Test"}
        </button>
      </form>
    </RoleGate>
  );
}
