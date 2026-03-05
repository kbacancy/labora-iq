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
      <h1 className="text-2xl font-semibold tracking-tight text-gray-100">{title}</h1>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
    {actionHref && actionLabel ? (
      <Link
        href={actionHref}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
      >
        {actionLabel}
      </Link>
    ) : null}
  </div>
);
