interface MetricCardProps {
  label: string;
  value: string;
  trendText?: string;
  tone?: "neutral" | "good" | "warn" | "critical";
}

export const MetricCard = ({ label, value, trendText, tone = "neutral" }: MetricCardProps) => {
  const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
    neutral: "border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))]",
    good: "border-emerald-900/40 bg-[linear-gradient(180deg,rgba(4,120,87,0.18),rgba(2,44,34,0.14))]",
    warn: "border-amber-900/40 bg-[linear-gradient(180deg,rgba(120,53,15,0.16),rgba(69,26,3,0.14))]",
    critical: "border-red-900/40 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(69,10,10,0.14))]",
  };

  const trendStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
    neutral: "text-slate-400",
    good: "text-emerald-300",
    warn: "text-amber-300",
    critical: "text-red-300",
  };

  return (
    <div className={`rounded-[1.75rem] border p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ${toneStyles[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-5 text-5xl font-semibold leading-none tracking-[-0.04em] text-slate-50">{value}</p>
      {trendText ? <p className={`mt-4 text-sm leading-6 ${trendStyles[tone]}`}>{trendText}</p> : null}
    </div>
  );
};
