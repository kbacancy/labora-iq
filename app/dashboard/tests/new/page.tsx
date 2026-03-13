"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { labTestSchema } from "@/src/lib/validation";
import {
  SurfaceSection,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
} from "@/src/components/ui/surface";

type TestValues = {
  test_name: string;
  category?: string;
  price: number;
  normal_range: string;
  reference_range?: string;
  units?: string;
};

export default function NewTestPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<TestValues>();

  const onSubmit = handleSubmit(async (values) => {
    const parsed = labTestSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetchWithAccessToken("/api/tests", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setSubmitting(false);

      if (!response.ok) {
        setError(payload.error ?? "Unable to create test.");
        return;
      }

      router.replace("/dashboard/tests");
    } catch (error) {
      setSubmitting(false);
      setError(error instanceof Error ? error.message : "Unable to create test.");
    }
  });

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader title="Add Test" description="Create a diagnostic test and attach the commercial and clinical ranges used by the workflow." />
      <SurfaceSection eyebrow="Catalog authoring" title="Create test entry" description="Define the diagnostic item once so order creation and result entry inherit the same controlled metadata." className="max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={fieldLabelClassName}>Test name</span>
              <input {...register("test_name")} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Category</span>
              <input {...register("category")} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Price</span>
              <input type="number" step="0.01" {...register("price")} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Normal range</span>
              <input {...register("normal_range")} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Reference range</span>
              <input {...register("reference_range")} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Units</span>
              <input {...register("units")} className={inputClassName} />
            </label>
          </div>
          {error ? <p className={errorTextClassName}>{error}</p> : null}
          <button type="submit" disabled={submitting} className={primaryButtonClassName}>
            {submitting ? "Saving..." : "Save Test"}
          </button>
        </form>
      </SurfaceSection>
    </RoleGate>
  );
}
