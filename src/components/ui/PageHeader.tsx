import Link from "next/link";
import { primaryButtonClassName } from "@/src/components/ui/surface";

interface PageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  actionHref?: string;
  actionLabel?: string;
}

export const PageHeader = ({ title, description, eyebrow = "Operational surface", actionHref, actionLabel }: PageHeaderProps) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-blue-300">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{description}</p>
    </div>
    {actionHref && actionLabel ? (
      <Link
        href={actionHref}
        className={primaryButtonClassName}
      >
        {actionLabel}
      </Link>
    ) : null}
  </div>
);
