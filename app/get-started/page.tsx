"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const onboardingSchema = z.object({
  labName: z.string().trim().min(2, "Lab name is required."),
  adminFullName: z.string().trim().min(2, "Admin full name is required."),
  adminEmail: z.email("Enter a valid email address."),
  adminPassword: z.string().min(8, "Password must have at least 8 characters."),
  phone: z.string().trim().optional(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function GetStartedPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState } = useForm<OnboardingValues>({
    defaultValues: {
      labName: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(false);

    const parsed = onboardingSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Invalid onboarding payload.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setServerError(payload.error ?? "Onboarding failed.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Set Up Your Laboratory</h1>
        <p className="mt-2 text-sm text-slate-400">Create your first admin account. You can add receptionist and technician users after login.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Lab Name</label>
            <input
              type="text"
              {...register("labName")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Acme Diagnostics"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Admin Full Name</label>
            <input
              type="text"
              {...register("adminFullName")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Dr. Priya Shah"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Admin Email</label>
            <input
              type="email"
              {...register("adminEmail")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="admin@acmelab.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Admin Password</label>
            <input
              type="password"
              {...register("adminPassword")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Phone (optional)</label>
            <input
              type="text"
              {...register("phone")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="+1 555 010 1234"
            />
          </div>

          {(serverError ||
            formState.errors.labName?.message ||
            formState.errors.adminFullName?.message ||
            formState.errors.adminEmail?.message ||
            formState.errors.adminPassword?.message) && (
            <p className="text-sm text-red-400">
              {serverError ??
                formState.errors.labName?.message ??
                formState.errors.adminFullName?.message ??
                formState.errors.adminEmail?.message ??
                formState.errors.adminPassword?.message}
            </p>
          )}

          {success ? <p className="text-sm text-emerald-300">Lab admin created successfully. Redirecting to login...</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-blue-500/60 bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already configured?{" "}
          <Link href="/login" className="text-blue-300 hover:text-blue-200">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
