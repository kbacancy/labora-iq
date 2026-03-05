"use client";

export default function DashboardError({ error }: { error: Error }) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-300">
      <p className="font-medium">Something went wrong while loading dashboard data.</p>
      <p className="mt-1 text-red-400">{error.message}</p>
    </div>
  );
}
