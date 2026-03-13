"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { publicOnboardingRequestSchema } from "@/src/lib/validation";

type OnboardingValues = {
  labName: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  website?: string;
  startedAt: string;
};

const launchPoints = [
  "Set up your lab and establish the tenant boundary from day one.",
  "Start with governed user access for reception, execution, and review.",
  "Move immediately into patient, order, sample, and report operations.",
];

export default function GetStartedPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const startedAt = useMemo(() => new Date().toISOString(), []);

  const { register, handleSubmit, formState } = useForm<OnboardingValues>({
    defaultValues: {
      labName: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      phone: "",
      website: "",
      startedAt,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccessMessage(null);

    const parsed = publicOnboardingRequestSchema.safeParse(values);
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

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) {
      setServerError(payload.error ?? "Onboarding failed.");
      return;
    }

    setSuccessMessage(payload.message ?? "Account created successfully.");
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.72),transparent_85%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-between">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-[2.25rem] font-semibold tracking-tight text-slate-100">
              LaboraIQ
            </Link>
            <p className="mt-2 text-[10px] uppercase tracking-[0.34em] text-slate-500">Lab operations intelligence</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Home
            </Link>
          </div>
        </header>

        <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(480px,0.98fr)] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)]" />
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Lab setup</span>
            </div>

            <h1 className="mt-8 text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-slate-50 md:text-7xl">
              Set up the lab.
              <br />
              Establish control.
              <br />
              Launch the workflow.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Set up your lab, create the first admin account, and start operating with governed access, audit-aware
              controls, and a unified operational surface.
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-slate-800/80 bg-slate-900/45 p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">Launch sequence</p>
              <div className="mt-5 space-y-4">
                {launchPoints.map((point) => (
                  <div key={point} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-blue-400" />
                    <p className="text-sm leading-7 text-slate-300">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)] blur-2xl" />
            <div className="relative rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">Lab setup</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50">Set Up Your Lab</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Your first admin account will be created during setup so you can start operating right away.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-700/60 bg-emerald-900/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Secure launch
                </span>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <input type="hidden" {...register("startedAt")} />
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  {...register("website")}
                  className="hidden"
                />

                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Lab Name</label>
                  <input
                    type="text"
                    {...register("labName")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="Acme Diagnostics"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Full Name</label>
                  <input
                    type="text"
                    {...register("adminFullName")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="Dr. Priya Shah"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Email</label>
                  <input
                    type="email"
                    {...register("adminEmail")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="admin@acmelab.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Password</label>
                  <input
                    type="password"
                    {...register("adminPassword")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Phone (optional)</label>
                  <input
                    type="text"
                    {...register("phone")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="+1 555 010 1234"
                  />
                </div>

                {(serverError ||
                  formState.errors.labName?.message ||
                  formState.errors.adminFullName?.message ||
                  formState.errors.adminEmail?.message ||
                  formState.errors.adminPassword?.message) && (
                  <p className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {serverError ??
                      formState.errors.labName?.message ??
                      formState.errors.adminFullName?.message ??
                      formState.errors.adminEmail?.message ??
                      formState.errors.adminPassword?.message}
                  </p>
                )}

                {successMessage ? (
                  <p className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
                    {successMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl border border-blue-500/60 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Setting Up..." : "Set Up Lab"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4 text-sm text-slate-400">
                Already configured?{" "}
                <Link href="/login" className="font-medium text-blue-300 hover:text-blue-200">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
