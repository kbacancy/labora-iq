"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/src/context/AuthContext";
import { loginSchema } from "@/src/lib/validation";

type LoginValues = {
  email: string;
  password: string;
};

const proofPoints = [
  "Role-specific dashboards for admin, receptionist, and technician teams.",
  "Governed patient-to-report workflow with approval gates.",
  "Audit-backed operations with retention and access review controls.",
];

const commandStats = [
  { label: "Workflow Stages", value: "6" },
  { label: "Operational Roles", value: "3" },
  { label: "Governance", value: "Built-In" },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid login payload.");
      return;
    }

    setSubmitting(true);
    const response = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    router.replace("/dashboard");
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_78%_10%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.7),transparent_85%)]" />

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
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Home
            </Link>
            <Link
              href="/get-started"
              className="rounded-xl border border-blue-500/60 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30"
            >
              Set Up Your Lab
            </Link>
          </div>
        </header>

        <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)]" />
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Secure laboratory access</span>
            </div>

            <h1 className="mt-8 text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-slate-50 md:text-7xl">
              Welcome to LaboraIQ
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Sign in to continue into your governed laboratory workspace and operate patient flow, results, approvals,
              and reporting from one controlled command surface.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {commandStats.map((item) => (
                <article key={item.label} className="rounded-2xl border border-slate-800/80 bg-slate-900/45 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50">{item.value}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-slate-800/80 bg-slate-900/45 p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">Why teams return here daily</p>
              <div className="mt-5 space-y-4">
                {proofPoints.map((point) => (
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
                  <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">Secure access</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50">Operator sign-in</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Use your workspace credentials to continue to the dashboard.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-700/60 bg-emerald-900/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Protected
                </span>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Email</label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="name@laboraiq.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400">Password</label>
                  <input
                    type="password"
                    {...register("password")}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                    placeholder="********"
                  />
                </div>

                {(errorMessage || formState.errors.email?.message || formState.errors.password?.message) && (
                  <p className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {errorMessage ?? formState.errors.email?.message ?? formState.errors.password?.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl border border-blue-500/60 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4 text-sm text-slate-400">
                New laboratory?{" "}
                <Link href="/get-started" className="font-medium text-blue-300 hover:text-blue-200">
                  Start onboarding
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
