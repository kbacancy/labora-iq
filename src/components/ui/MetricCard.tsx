interface MetricCardProps {
  label: string;
  value: string;
  trendText?: string;
  tone?: "neutral" | "good" | "warn" | "critical";
}

export const MetricCard = ({ label, value, trendText, tone = "neutral" }: MetricCardProps) => {
  const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
    neutral: "border-slate-800/80 bg-slate-900/65",
    good: "border-emerald-900/40 bg-emerald-950/20",
    warn: "border-amber-900/40 bg-amber-950/20",
    critical: "border-red-900/40 bg-red-950/20",
  };

  const trendStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
    neutral: "text-gray-400",
    good: "text-emerald-300",
    warn: "text-amber-300",
    critical: "text-red-300",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] ${toneStyles[tone]}`}>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-4xl font-semibold leading-none tracking-tight text-slate-50">{value}</p>
      {trendText ? <p className={`mt-2 text-xs ${trendStyles[tone]}`}>{trendText}</p> : null}
    </div>
  );
};
