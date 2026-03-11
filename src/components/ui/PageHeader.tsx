import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export const PageHeader = ({ title, description, actionHref, actionLabel }: PageHeaderProps) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{title}</h1>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
    {actionHref && actionLabel ? (
      <Link
        href={actionHref}
        className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
      >
        {actionLabel}
      </Link>
    ) : null}
  </div>
);
