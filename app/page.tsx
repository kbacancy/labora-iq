export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <p className="text-2xl font-semibold tracking-tight text-slate-100">LaboraIQ</p>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Sign In
            </a>
            <a
              href="/get-started"
              className="rounded-lg border border-blue-500/60 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/30"
            >
              Start Free
            </a>
          </div>
        </header>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="inline-block rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              Laboratory Operations Platform
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-50 md:text-6xl">
              Run Your Lab With
              <br />
              Operational Clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
              LaboraIQ unifies patients, orders, samples, results, notifications, and compliance in one role-based system.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/get-started"
                className="rounded-xl border border-blue-500/60 bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30"
              >
                Create Lab Admin
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900/75 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Open Dashboard
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">What You Get</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Role-based dashboards for admin, receptionist, and technician</li>
              <li>End-to-end patient to report workflow with approval gating</li>
              <li>Real-time operational notifications and action queues</li>
              <li>Audit logs, retention controls, and access review exports</li>
              <li>Admin-controlled user management and governance console</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
