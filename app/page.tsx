import Link from "next/link";

const metrics = [
  {
    label: "Labs Using LaboraIQ",
    value: "50+",
    detail: "Multi-tenant lab workspaces running governed intake, execution, and release flows.",
  },
  {
    label: "Workflows Processed",
    value: "120K+",
    detail: "Orders, samples, results, approvals, and reports handled through one operating surface.",
  },
  {
    label: "Operational Roles",
    value: "3",
    detail: "Admin, receptionist, and technician experiences tuned to the work each role needs to do.",
  },
  {
    label: "Governance State",
    value: "Built-In",
    detail: "Audit history, approval controls, and tenant isolation are part of the core product.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Intake",
    detail: "Register patients, validate demographics, and stage clean operational records.",
  },
  {
    step: "02",
    title: "Orders",
    detail: "Create routed test requests with pricing, technician ownership, and referral context.",
  },
  {
    step: "03",
    title: "Samples",
    detail: "Track collection, handoff, readiness, and execution state without losing chain-of-work visibility.",
  },
  {
    step: "04",
    title: "Results",
    detail: "Capture findings and remarks in the same governed surface used for operational execution.",
  },
  {
    step: "05",
    title: "Approval",
    detail: "Review and govern report release through explicit checkpoints instead of ad hoc signoff.",
  },
  {
    step: "06",
    title: "Reports",
    detail: "Publish approved outputs with retention, audit context, and release discipline attached.",
  },
];

const modules = [
  {
    title: "Patient Registry",
    summary: "Keep demographic intake, archive controls, and patient search clean across the lab lifecycle.",
  },
  {
    title: "Order Composition",
    summary: "Assemble test bundles, assign technicians, and manage request value from one surface.",
  },
  {
    title: "Sample Operations",
    summary: "Track collection, receipt, in-testing state, and technician ownership with less handoff friction.",
  },
  {
    title: "Result Workflow",
    summary: "Enter findings, manage completion, and progress work toward governed review and approval.",
  },
  {
    title: "Report Release",
    summary: "Generate approved outputs with publication discipline and downstream traceability built in.",
  },
  {
    title: "Admin Governance",
    summary: "Manage settings, audit visibility, role provisioning, and tenant-scoped operational control.",
  },
];

const governanceSignals = [
  {
    title: "Approval Queues",
    detail: "See what is pending review before it slows report delivery or creates hidden release risk.",
  },
  {
    title: "Audit Visibility",
    detail: "Workflow, access, and operational changes remain visible without leaving the product surface.",
  },
  {
    title: "Role Access Control",
    detail: "Execution is separated by role while keeping the workflow connected end to end.",
  },
  {
    title: "Tenant Data Governance",
    detail: "Organization boundaries, notifications, settings, and approvals stay scoped to the correct lab.",
  },
];

const governancePreviewSignals = [
  { label: "Pending review", value: "04", tone: "text-emerald-300" },
  { label: "Audit events", value: "128", tone: "text-slate-100" },
  { label: "Access checks", value: "12", tone: "text-slate-100" },
];

const launchSteps = [
  {
    step: "01",
    title: "Set Up the Workspace",
    detail: "Create the lab, establish the first admin account, and activate the governed tenant boundary.",
  },
  {
    step: "02",
    title: "Load the Operating Surface",
    detail: "Configure tests, team roles, and workflow modules so the lab starts from a structured base.",
  },
  {
    step: "03",
    title: "Run the Release Workflow",
    detail: "Move from patient intake to report publication inside a single compliance-aware system.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-6 py-8 md:px-10 xl:px-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(70,119,255,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.04),transparent_34%)]" />

      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[2.35rem] font-semibold tracking-tight text-slate-100">LaboraIQ</p>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500">Lab Operations Intelligence</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Sign In
            </Link>
            <Link
              href="/get-started"
              className="rounded-xl border border-blue-500/60 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30"
            >
              Set Up Your Lab
            </Link>
          </div>
        </header>

        <section className="relative mt-20 grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.65)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-300">
                Laboratory operating system
              </span>
            </div>

            <h1 className="mt-8 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-slate-50 md:text-7xl">
              Govern the lab.
              <br />
              Run the workflow.
              <br />
              Release with confidence.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              LaboraIQ brings patients, orders, samples, results, approvals, and reports into one modern operating
              surface for diagnostic teams that need execution speed without losing control.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/get-started"
                className="rounded-2xl border border-blue-500/60 bg-blue-500/20 px-6 py-3.5 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30"
              >
                Set Up Your Lab
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Explore Dashboard
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.52))] p-4 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-700/90 hover:shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Role-aware</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-100">Dashboards tuned for admin, reception, and technical execution.</p>
              </article>
              <article className="rounded-2xl border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.52))] p-4 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-700/90 hover:shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Workflow-first</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-100">One connected path from intake to approved release.</p>
              </article>
              <article className="rounded-2xl border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.52))] p-4 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-700/90 hover:shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Compliance-native</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-100">Approvals, audit trails, and governance live in the product, not outside it.</p>
              </article>
            </div>
          </div>

          <div className="relative lg:col-span-6 xl:col-span-7">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.2),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_30%)] blur-2xl" />
            <div className="relative rounded-[2rem] border border-slate-800 bg-slate-950/85 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-sm">
              <div className="rounded-[1.6rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.9))] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Product preview</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-50">Lab command center</p>
                  </div>
                  <div className="rounded-full border border-emerald-700/60 bg-emerald-900/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                    Queue stable
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                    <p className="text-sm text-slate-400">Operational queue</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Orders in progress</p>
                        <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-50">28</p>
                      </div>
                      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Approvals pending</p>
                        <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-50">04</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      Track work in motion, review queues, and release readiness without splitting execution from governance.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-100">Workflow chain</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live surface</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {workflowSteps.slice(0, 4).map((item) => (
                        <div key={item.step} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Step {item.step}</span>
                            <span className="text-sm font-medium text-slate-100">{item.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-blue-900/40 bg-blue-950/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300">Release discipline</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">Approved only</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">Reports move to publication after governed review states are completed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-24 rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.56),rgba(15,23,42,0.38))] p-6 md:p-8">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/80 to-transparent" />
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Social proof</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Trusted to run operational work, not just display it.
              </h2>
            </div>
            <p className="text-sm leading-7 text-slate-400 lg:col-span-5">
              The platform is built around visibility, governed execution, and consistent release control so labs can scale without losing operational trust.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),rgba(15,23,42,0.72))] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">{metric.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/70 to-transparent" />
          <div className="pt-10">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Workflow overview</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Intake to release, designed as one connected operating path.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Each stage is visible in the same system so teams can route work, execute tasks, and govern approvals without workflow fragmentation.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              {workflowSteps.map((item) => (
                <article
                  key={item.step}
                  className="group rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.86),rgba(15,23,42,0.7))] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Step {item.step}</span>
                    <span className="h-2 w-2 rounded-full bg-slate-700 transition group-hover:bg-blue-400" />
                  </div>
                  <p className="mt-4 text-xl font-medium text-slate-100">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/70 to-transparent" />
          <div className="pt-10">
            <section className="rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.5),rgba(15,23,42,0.34))] p-6 md:p-8">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Platform modules</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                    Every operational module belongs to the same product surface.
                  </h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-slate-400 xl:justify-self-end">
                  Patients, orders, samples, results, reports, and admin controls stay aligned in one connected
                  product model so work does not fragment as the lab scales.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => (
                  <article
                    key={module.title}
                    className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.86),rgba(15,23,42,0.68))] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_18px_34px_rgba(0,0,0,0.18)]"
                  >
                    <p className="text-lg font-medium text-slate-100">{module.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{module.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-12">
              <section className="rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.85))] p-6 md:p-8 shadow-[0_18px_38px_rgba(0,0,0,0.18)] xl:col-span-7">
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Governance & compliance</p>
                  <span className="rounded-full border border-emerald-700/60 bg-emerald-900/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                    Live now
                  </span>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {governanceSignals.map((signal) => (
                    <article
                      key={signal.title}
                      className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.84),rgba(15,23,42,0.62))] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_18px_34px_rgba(0,0,0,0.18)]"
                    >
                      <p className="text-sm font-medium text-slate-100">{signal.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{signal.detail}</p>
                    </article>
                  ))}
                </div>

                <article className="mt-6 rounded-[1.6rem] border border-slate-800 bg-[linear-gradient(135deg,rgba(2,6,23,0.88),rgba(15,23,42,0.74)_58%,rgba(59,130,246,0.1))] p-6 shadow-[0_20px_36px_rgba(0,0,0,0.18)]">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-blue-300">Feature highlight</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
                        Compliance control center built into daily operations.
                      </h3>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                        Review queues, audit visibility, role boundaries, and release checks stay visible in the same
                        operating surface that moves the work forward.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          Approval checkpoints
                        </span>
                        <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          Tenant isolation
                        </span>
                        <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          Access review
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Governance snapshot</p>
                          <p className="mt-1 text-sm font-medium text-slate-100">Release readiness</p>
                        </div>
                        <span className="rounded-full border border-emerald-700/60 bg-emerald-900/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                          In policy
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {governancePreviewSignals.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
                          >
                            <span className="text-sm text-slate-400">{item.label}</span>
                            <span className={`text-lg font-semibold tracking-tight ${item.tone}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-xl border border-blue-900/40 bg-blue-950/10 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300">Release rule</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Completed work advances only after review state, audit trace, and org-scoped approvals are in
                          place.
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section className="rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(15,23,42,0.58)_58%,rgba(16,185,129,0.08))] p-6 md:p-8 xl:col-span-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Setup / launch workflow</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
                      Stand up the workspace with structure from day one.
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                    Deployment ready
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {launchSteps.map((step) => (
                    <article
                      key={step.step}
                      className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(15,23,42,0.62))] px-5 py-4 transition duration-200 hover:border-slate-700 hover:shadow-[0_18px_34px_rgba(0,0,0,0.16)]"
                    >
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Step {step.step}</p>
                      <p className="mt-3 text-lg font-medium text-slate-100">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="relative mt-24 rounded-[2rem] border border-blue-900/40 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.72)_55%,rgba(29,78,216,0.16))] p-7 md:p-10">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-700/40 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Final CTA</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                Set up a governed laboratory operation without bolting compliance on later.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Set up your lab, create the first admin account, invite your team, and run intake, execution, approvals,
                and report release from one platform.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/get-started"
                className="rounded-2xl border border-blue-500/60 bg-blue-500/25 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/35"
              >
                Set Up Your Lab
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
