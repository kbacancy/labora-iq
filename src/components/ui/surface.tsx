import type { ReactNode } from "react";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export const surfaceClassName =
  "rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] shadow-[0_18px_50px_rgba(0,0,0,0.24)]";

export const surfaceMutedClassName = "rounded-2xl border border-slate-800 bg-slate-950/70";

export const inputClassName =
  "w-full rounded-2xl border border-slate-800 bg-slate-950/85 px-4 py-3 text-sm text-slate-100 transition placeholder:text-slate-500 focus:border-slate-600 focus:outline-none";

export const selectClassName =
  "w-full rounded-2xl border border-slate-800 bg-slate-950/85 px-4 py-3 text-sm text-slate-100 transition focus:border-slate-600 focus:outline-none";

export const primaryButtonClassName =
  "rounded-2xl border border-blue-500/60 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClassName =
  "rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClassName =
  "rounded-2xl border border-red-900/60 bg-red-950/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:border-red-700 hover:bg-red-950/20 disabled:cursor-not-allowed disabled:opacity-60";

export const compactButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

export const compactAccentButtonClassName =
  "rounded-xl border border-blue-500/50 bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-200 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60";

export const compactDangerButtonClassName =
  "rounded-xl border border-red-900/60 bg-red-950/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:border-red-700 hover:bg-red-950/20 disabled:cursor-not-allowed disabled:opacity-60";

export const fieldLabelClassName = "mb-2 block text-[11px] uppercase tracking-[0.22em] text-slate-400";
export const helperTextClassName = "mt-2 text-xs leading-6 text-slate-500";
export const errorTextClassName = "rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300";
export const successTextClassName = "rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300";

export const tableWrapperClassName = `${surfaceClassName} overflow-hidden`;
export const tableHeadClassName = "border-b border-slate-800 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500";
export const tableHeaderCellClassName = "px-5 py-4 font-medium";
export const tableRowClassName = "border-t border-slate-800 text-slate-200";
export const tableCellClassName = "px-5 py-4 align-top";
export const tableMutedCellClassName = "px-5 py-4 align-top text-slate-400";

type SurfaceSectionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const SurfaceSection = ({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SurfaceSectionProps) => (
  <section className={cx(surfaceClassName, className)}>
    {(eyebrow || title || description || action) ? (
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div>
          {eyebrow ? <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">{eyebrow}</p> : null}
          {title ? <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-50">{title}</h2> : null}
          {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="flex items-center gap-3">{action}</div> : null}
      </div>
    ) : null}
    <div className={cx("p-6", contentClassName)}>{children}</div>
  </section>
);

type StatusBadgeProps = {
  tone?: "neutral" | "info" | "good" | "warn" | "danger";
  children: ReactNode;
  className?: string;
};

export const StatusBadge = ({ tone = "neutral", children, className }: StatusBadgeProps) => {
  const tones = {
    neutral: "border-slate-700/80 bg-slate-900/70 text-slate-300",
    info: "border-blue-900/60 bg-blue-950/20 text-blue-300",
    good: "border-emerald-900/50 bg-emerald-950/20 text-emerald-300",
    warn: "border-amber-900/50 bg-amber-950/20 text-amber-300",
    danger: "border-red-900/50 bg-red-950/20 text-red-300",
  } as const;

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};
