interface MetricCardProps {
  label: string;
  value: string;
}

export const MetricCard = ({ label, value }: MetricCardProps) => (
  <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-100">{value}</p>
  </div>
);
