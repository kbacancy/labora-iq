const workflowSteps = [
  { title: "Patient Intake", detail: "Register patients and demographics with receptionist controls." },
  { title: "Order Creation", detail: "Create multi-test orders with pricing and assignment." },
  { title: "Sample Processing", detail: "Track collection, receipt, and technician execution state." },
  { title: "Result Entry", detail: "Capture findings with remarks and quality guardrails." },
  { title: "Approval & Report", detail: "Review, approve, and publish downloadable reports." },
];

const roleCards = [
  {
    role: "Admin",
    value: "Governance & Control",
    points: ["User and org management", "Compliance and audit exports", "Approval queue and revenue visibility"],
  },
  {
    role: "Receptionist",
    value: "Intake Velocity",
    points: ["Patient registration", "Order and sample coordination", "Notification-driven follow-up"],
  },
  {
    role: "Technician",
    value: "Execution Throughput",
    points: ["Assigned sample workload", "Result entry and progression", "Action queue for pending work"],
  },
];

const modules = [
  "Patients",
  "Orders",
  "Samples",
  "Results",
  "Reports",
  "Inventory",
  "Notifications",
  "Admin Console",
];

const faqs = [
  {
    q: "How long does onboarding take?",
    a: "Most labs can create an admin account and start intake in under 10 minutes.",
  },
  {
    q: "Can we run multiple laboratories in one product?",
    a: "Yes. LaboraIQ uses organization-level tenant isolation with org-scoped access policies.",
  },
  {
    q: "How is compliance handled?",
    a: "Audit logs, retention controls, and access review exports are built into the admin workflow.",
  },
  {
    q: "Can we invite users instead of sharing passwords?",
    a: "Yes. Admins can provision staff via invite link or direct password setup.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <p className="text-3xl font-semibold tracking-tight text-slate-100">LaboraIQ</p>
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

        <section className="mt-14 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="inline-block rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              Multi-Tenant Laboratory SaaS
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-50 md:text-6xl">
              Operational Intelligence
              <br />
              For Modern Labs.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
              LaboraIQ unifies patient operations, lab workflow, role-based execution, and compliance in one secure platform.
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Why Teams Choose LaboraIQ</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Role-specific dashboards and action queues</li>
              <li>Patient-to-report lifecycle control with approvals</li>
              <li>Real-time notifications across operations</li>
              <li>Audit, retention, and access review workflows</li>
              <li>Organization-level tenant isolation</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Labs Onboarded</p>
            <p className="mt-1 text-3xl font-semibold text-slate-100">50+</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reports Processed</p>
            <p className="mt-1 text-3xl font-semibold text-slate-100">120K+</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active Roles</p>
            <p className="mt-1 text-3xl font-semibold text-slate-100">3</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Compliance Readiness</p>
            <p className="mt-1 text-3xl font-semibold text-slate-100">Built-In</p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Workflow</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">From Intake To Approved Report</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Step {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{step.title}</p>
                <p className="mt-2 text-xs text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Role Value</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Built For Every Function</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {roleCards.map((card) => (
              <article key={card.role} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{card.role}</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">{card.value}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Modules</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Complete Lab Operating Surface</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {modules.map((module) => (
              <div key={module} className="rounded-xl border border-slate-800 bg-slate-950/65 px-4 py-3 text-sm text-slate-200">
                {module}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Compliance & Security</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Governance By Design</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Tenant isolation via organization-scoped RLS</li>
              <li>Audit trails for critical workflow actions</li>
              <li>Retention and access review policy controls</li>
              <li>Admin-only governance and compliance console</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Integrations & Roadmap</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Built To Extend</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Open API patterns for LIS/HIS integration</li>
              <li>HL7/FHIR-ready roadmap alignment</li>
              <li>AI-assisted interpretation layer (planned)</li>
              <li>SLA and TAT analytics enhancements</li>
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Common Questions</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-slate-100">{item.q}</p>
                <p className="mt-2 text-sm text-slate-300">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-blue-900/50 bg-gradient-to-r from-slate-900/90 to-blue-950/30 p-7">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50">Ready To Modernize Your Laboratory Operations?</h2>
          <p className="mt-2 text-sm text-slate-300">
            Start your workspace in minutes, invite your team, and run a fully role-governed lab workflow.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="/get-started"
              className="rounded-xl border border-blue-500/60 bg-blue-500/25 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/35"
            >
              Start Free
            </a>
            <a
              href="/login"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Sign In
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
