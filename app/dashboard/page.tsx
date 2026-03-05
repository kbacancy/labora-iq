"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency } from "@/src/lib/format";

interface DashboardMetric {
  label: string;
  value: string;
}

export default function DashboardPage() {
  const { role, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!role) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayIso = todayStart.toISOString();

        if (role === "admin") {
          const [{ count: patientCount }, { count: orderCount }, { count: pendingCount }, { data: revenueRows }] =
            await Promise.all([
              supabase.from("patients").select("*", { count: "exact", head: true }),
              supabase.from("lab_orders").select("*", { count: "exact", head: true }),
              supabase.from("lab_orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
              supabase.from("lab_orders").select("total_price").gte("created_at", todayIso).eq("status", "completed"),
            ]);

          const revenue = (revenueRows ?? []).reduce((sum, row) => sum + Number(row.total_price ?? 0), 0);
          setMetrics([
            { label: "Total Patients", value: String(patientCount ?? 0) },
            { label: "Total Orders", value: String(orderCount ?? 0) },
            { label: "Pending Reports", value: String(pendingCount ?? 0) },
            { label: "Today's Revenue", value: formatCurrency(revenue) },
          ]);
        }

        if (role === "receptionist") {
          const [{ count: todaysOrders }, { count: pendingOrders }] = await Promise.all([
            supabase.from("lab_orders").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
            supabase.from("lab_orders").select("*", { count: "exact", head: true }).neq("status", "completed"),
          ]);

          setMetrics([
            { label: "Today's Orders", value: String(todaysOrders ?? 0) },
            { label: "Pending Orders", value: String(pendingOrders ?? 0) },
          ]);
        }

        if (role === "technician") {
          const [assignedSamples, pendingTests, completedTests] = await Promise.all([
            supabase.from("samples").select("*", { count: "exact", head: true }).eq("technician_id", user?.id ?? ""),
            supabase
              .from("samples")
              .select("*", { count: "exact", head: true })
              .eq("technician_id", user?.id ?? "")
              .in("status", ["collected", "received", "in_testing"]),
            supabase
              .from("samples")
              .select("*", { count: "exact", head: true })
              .eq("technician_id", user?.id ?? "")
              .in("status", ["completed", "reported"])
              .gte("created_at", todayIso),
          ]);

          setMetrics([
            { label: "Assigned Samples", value: String(assignedSamples.count ?? 0) },
            { label: "Pending Tests", value: String(pendingTests.count ?? 0) },
            { label: "Completed Tests", value: String(completedTests.count ?? 0) },
          ]);
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [role, user?.id]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live operational metrics for your laboratory." />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      )}
    </div>
  );
}
