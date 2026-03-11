"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency, formatDate } from "@/src/lib/format";

interface DashboardMetric {
  label: string;
  value: string;
  trendText?: string;
  tone?: "neutral" | "good" | "warn" | "critical";
}

interface ActionItem {
  label: string;
  value?: string;
  detail?: string;
  href: string;
  cta: string;
}

interface RecentItem {
  title: string;
  subtitle: string;
  time: string;
}

interface FocusRow {
  primary: string;
  secondary: string;
  status: string;
  href: string;
}

interface UrgencyItem {
  label: string;
  value: number;
  href: string;
  tone: "good" | "warn" | "critical";
}

interface InsightCard {
  title: string;
  body: string;
}

const formatDiff = (today: number, yesterday: number, suffix: string) => {
  const diff = today - yesterday;
  const prefix = diff > 0 ? "+" : "";
  return `${prefix}${diff} ${suffix} vs yesterday`;
};

const formatRelativeTime = (value: string) => {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) {
    return "";
  }
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const statusToneClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("completed") || normalized.includes("reported")) {
    return "bg-emerald-600/20 text-emerald-300";
  }
  if (normalized.includes("pending") || normalized.includes("draft") || normalized.includes("received")) {
    return "bg-amber-600/20 text-amber-300";
  }
  if (normalized.includes("overdue") || normalized.includes("failed")) {
    return "bg-red-600/20 text-red-300";
  }
  return "bg-blue-600/20 text-blue-300";
};

export default function DashboardPage() {
  const { role, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [focusRows, setFocusRows] = useState<FocusRow[]>([]);
  const [focusTitle, setFocusTitle] = useState("Priority Queue");
  const [focusEmptyCta, setFocusEmptyCta] = useState<{ href: string; label: string } | null>(null);
  const [urgencyItems, setUrgencyItems] = useState<UrgencyItem[]>([]);
  const [insight, setInsight] = useState<InsightCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!role) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const threeHoursAgoIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

        const todayIso = todayStart.toISOString();
        const tomorrowIso = tomorrowStart.toISOString();
        const yesterdayIso = yesterdayStart.toISOString();

        if (role === "admin") {
          const [
            { count: patientCount },
            { count: orderCount },
            { count: pendingReportsCount },
            { data: todayRevenueRows },
            { data: yesterdayRevenueRows },
            { count: todayOrdersCount },
            { count: yesterdayOrdersCount },
            { count: pendingApprovals },
            { count: overdueOrders },
            { count: unreadNotifications },
            { data: approvalRows },
            { data: auditRows },
          ] = await Promise.all([
            supabase.from("patients").select("*", { count: "exact", head: true }).eq("is_archived", false),
            supabase.from("lab_orders").select("*", { count: "exact", head: true }),
            supabase
              .from("lab_orders")
              .select("*", { count: "exact", head: true })
              .eq("status", "completed")
              .neq("approval_status", "approved"),
            supabase
              .from("lab_orders")
              .select("total_price")
              .gte("completed_at", todayIso)
              .lt("completed_at", tomorrowIso)
              .eq("status", "completed")
              .eq("approval_status", "approved"),
            supabase
              .from("lab_orders")
              .select("total_price")
              .gte("completed_at", yesterdayIso)
              .lt("completed_at", todayIso)
              .eq("status", "completed")
              .eq("approval_status", "approved"),
            supabase.from("lab_orders").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
            supabase
              .from("lab_orders")
              .select("*", { count: "exact", head: true })
              .gte("created_at", yesterdayIso)
              .lt("created_at", todayIso),
            supabase
              .from("lab_orders")
              .select("*", { count: "exact", head: true })
              .eq("status", "completed")
              .neq("approval_status", "approved"),
            supabase
              .from("lab_orders")
              .select("*", { count: "exact", head: true })
              .lt("created_at", fourHoursAgoIso)
              .in("status", ["pending", "in_progress"]),
            supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .or(`recipient_user_id.eq.${user?.id ?? ""},recipient_role.eq.admin`)
              .eq("is_read", false),
            supabase
              .from("lab_orders")
              .select("id,patient_id,approval_status,created_at")
              .eq("status", "completed")
              .neq("approval_status", "approved")
              .order("created_at", { ascending: true })
              .limit(8),
            supabase.from("audit_logs").select("action,table_name,timestamp").order("timestamp", { ascending: false }).limit(6),
          ]);

          const todayRevenue = (todayRevenueRows ?? []).reduce((sum, row) => sum + Number(row.total_price ?? 0), 0);
          const yesterdayRevenue = (yesterdayRevenueRows ?? []).reduce((sum, row) => sum + Number(row.total_price ?? 0), 0);
          const revenueDiff = todayRevenue - yesterdayRevenue;

          setMetrics([
            {
              label: "Total Patients",
              value: String(patientCount ?? 0),
              trendText: `${todayOrdersCount ?? 0} orders created today`,
              tone: "neutral",
            },
            {
              label: "Total Orders",
              value: String(orderCount ?? 0),
              trendText: formatDiff(todayOrdersCount ?? 0, yesterdayOrdersCount ?? 0, "orders"),
              tone: "neutral",
            },
            {
              label: "Pending Reports",
              value: String(pendingReportsCount ?? 0),
              trendText: pendingReportsCount ? "Awaiting admin approval" : "Queue clear",
              tone: (pendingReportsCount ?? 0) > 0 ? "warn" : "good",
            },
            {
              label: "Today's Approved Revenue",
              value: formatCurrency(todayRevenue),
              trendText: `${revenueDiff >= 0 ? "+" : ""}${formatCurrency(revenueDiff)} vs yesterday`,
              tone: revenueDiff >= 0 ? "good" : "warn",
            },
          ]);

          setUrgencyItems([
            { label: "Approvals Pending", value: pendingApprovals ?? 0, href: "/dashboard/results", tone: (pendingApprovals ?? 0) > 0 ? "warn" : "good" },
            { label: "Overdue Orders", value: overdueOrders ?? 0, href: "/dashboard/orders", tone: (overdueOrders ?? 0) > 0 ? "critical" : "good" },
            { label: "Unread Alerts", value: unreadNotifications ?? 0, href: "/dashboard/notifications", tone: (unreadNotifications ?? 0) > 0 ? "warn" : "good" },
          ]);

          setActionItems([
            {
              label: "Review Approval Backlog",
              value: String(pendingApprovals ?? 0),
              detail: "Completed orders awaiting governance",
              href: "/dashboard/results",
              cta: "Open Results",
            },
            {
              label: "Open Compliance Console",
              detail: "Retention and access review controls",
              href: "/admin/compliance",
              cta: "Open Compliance",
            },
            {
              label: "Inspect Audit Trail",
              value: String(unreadNotifications ?? 0),
              detail: "Recent governance and workflow events",
              href: "/admin/audit-logs",
              cta: "Open Audit Logs",
            },
          ]);

          setInsight({
            title: "AI Ops Insight",
            body:
              (pendingApprovals ?? 0) > 0
                ? `${pendingApprovals} completed orders are waiting for approval. Prioritize report governance to prevent TAT slippage.`
                : "Approval backlog is healthy. Focus next on reducing order aging and response latency.",
          });

          const patientIds = [...new Set((approvalRows ?? []).map((row) => row.patient_id).filter(Boolean))];
          let patientNames = new Map<string, string>();
          if (patientIds.length > 0) {
            const { data: patientRows } = await supabase.from("patients").select("id,name").in("id", patientIds);
            patientNames = new Map((patientRows ?? []).map((row) => [row.id, row.name]));
          }

          setFocusTitle("Approval Queue");
          setFocusEmptyCta({ href: "/dashboard/results", label: "Open Results Workflow" });
          setFocusRows(
            (approvalRows ?? []).map((row) => ({
              primary: `Order ${row.id.slice(0, 8)}`,
              secondary: `${patientNames.get(row.patient_id) ?? "Unknown Patient"} - ${formatDate(row.created_at)}`,
              status: row.approval_status ?? "draft",
              href: `/dashboard/results?orderId=${row.id}`,
            }))
          );

          setRecentItems(
            (auditRows ?? []).map((row) => ({
              title: row.action.replaceAll("_", " "),
              subtitle: row.table_name,
              time: row.timestamp,
            }))
          );
        }

        if (role === "receptionist") {
          const [
            { count: todaysOrders },
            { count: yesterdaysOrders },
            { count: pendingOrders },
            { count: patientsToday },
            { count: unreadNotifications },
            { data: orderRows },
          ] = await Promise.all([
            supabase.from("lab_orders").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
            supabase
              .from("lab_orders")
              .select("*", { count: "exact", head: true })
              .gte("created_at", yesterdayIso)
              .lt("created_at", todayIso),
            supabase.from("lab_orders").select("*", { count: "exact", head: true }).neq("status", "completed"),
            supabase.from("patients").select("*", { count: "exact", head: true }).gte("created_at", todayIso).eq("is_archived", false),
            supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .or(`recipient_user_id.eq.${user?.id ?? ""},recipient_role.eq.receptionist`)
              .eq("is_read", false),
            supabase
              .from("lab_orders")
              .select("id,patient_id,status,total_price,created_at")
              .neq("status", "completed")
              .order("created_at", { ascending: false })
              .limit(8),
          ]);

          setMetrics([
            {
              label: "Today's Orders",
              value: String(todaysOrders ?? 0),
              trendText: formatDiff(todaysOrders ?? 0, yesterdaysOrders ?? 0, "orders"),
              tone: (todaysOrders ?? 0) > 0 ? "good" : "neutral",
            },
            {
              label: "Pending Orders",
              value: String(pendingOrders ?? 0),
              trendText: (pendingOrders ?? 0) > 0 ? "Needs assignment and progression" : "Queue clear",
              tone: (pendingOrders ?? 0) > 0 ? "warn" : "good",
            },
          ]);

          setUrgencyItems([
            { label: "Patients Added Today", value: patientsToday ?? 0, href: "/dashboard/patients", tone: "good" },
            { label: "Orders Awaiting Work", value: pendingOrders ?? 0, href: "/dashboard/orders", tone: (pendingOrders ?? 0) > 0 ? "warn" : "good" },
            { label: "Unread Alerts", value: unreadNotifications ?? 0, href: "/dashboard/notifications", tone: (unreadNotifications ?? 0) > 0 ? "warn" : "good" },
          ]);

          setActionItems([
            {
              label: "Register New Patient",
              value: String(patientsToday ?? 0),
              detail: "Fast intake for walk-ins",
              href: "/dashboard/patients/new",
              cta: "Add Patient",
            },
            {
              label: "Create Lab Order",
              value: String(todaysOrders ?? 0),
              detail: "Generate and assign tests quickly",
              href: "/dashboard/orders/new",
              cta: "Create Order",
            },
            {
              label: "Open Notifications",
              value: String(unreadNotifications ?? 0),
              detail: "Follow report-ready and intake alerts",
              href: "/dashboard/notifications",
              cta: "Open Alerts",
            },
          ]);

          setInsight({
            title: "AI Ops Insight",
            body:
              (pendingOrders ?? 0) > 0
                ? `${pendingOrders} orders are still active. Assign technicians quickly to protect turnaround targets.`
                : "Order intake is stable. You can focus on faster patient registration throughput.",
          });

          const orderPatientIds = [...new Set((orderRows ?? []).map((row) => row.patient_id).filter(Boolean))];
          let patientNames = new Map<string, string>();
          if (orderPatientIds.length > 0) {
            const { data: patientRows } = await supabase.from("patients").select("id,name").in("id", orderPatientIds);
            patientNames = new Map((patientRows ?? []).map((row) => [row.id, row.name]));
          }

          setFocusTitle("Today's Order Queue");
          setFocusEmptyCta({ href: "/dashboard/orders/new", label: "Create New Order" });
          setFocusRows(
            (orderRows ?? []).map((row) => ({
              primary: patientNames.get(row.patient_id) ?? `Order ${row.id.slice(0, 8)}`,
              secondary: `${formatCurrency(Number(row.total_price ?? 0))} - ${formatDate(row.created_at)}`,
              status: row.status,
              href: "/dashboard/orders",
            }))
          );

          setRecentItems(
            (orderRows ?? []).slice(0, 6).map((row) => ({
              title: `Order ${row.id.slice(0, 8)}`,
              subtitle: `${row.status} - ${formatCurrency(Number(row.total_price ?? 0))}`,
              time: row.created_at,
            }))
          );
        }

        if (role === "technician") {
          const [assignedSamples, pendingTests, completedToday, completedYesterday, activeSamples, notificationRows, overdueSamples] = await Promise.all([
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
            supabase
              .from("samples")
              .select("*", { count: "exact", head: true })
              .eq("technician_id", user?.id ?? "")
              .in("status", ["completed", "reported"])
              .gte("created_at", yesterdayIso)
              .lt("created_at", todayIso),
            supabase
              .from("samples")
              .select("id,sample_code,test_type,status,created_at")
              .eq("technician_id", user?.id ?? "")
              .in("status", ["collected", "received", "in_testing"])
              .order("created_at", { ascending: true })
              .limit(8),
            supabase
              .from("notifications")
              .select("title,type,created_at")
              .or(`recipient_user_id.eq.${user?.id ?? ""},recipient_role.eq.technician`)
              .order("created_at", { ascending: false })
              .limit(6),
            supabase
              .from("samples")
              .select("*", { count: "exact", head: true })
              .eq("technician_id", user?.id ?? "")
              .lt("created_at", threeHoursAgoIso)
              .in("status", ["collected", "received", "in_testing"]),
          ]);

          setMetrics([
            {
              label: "Assigned Samples",
              value: String(assignedSamples.count ?? 0),
              trendText: `${(activeSamples.data ?? []).length} currently active`,
              tone: "neutral",
            },
            {
              label: "Pending Tests",
              value: String(pendingTests.count ?? 0),
              trendText: (pendingTests.count ?? 0) > 0 ? "Execution required" : "Queue clear",
              tone: (pendingTests.count ?? 0) > 0 ? "warn" : "good",
            },
            {
              label: "Completed Tests",
              value: String(completedToday.count ?? 0),
              trendText: formatDiff(completedToday.count ?? 0, completedYesterday.count ?? 0, "tests"),
              tone: (completedToday.count ?? 0) >= (completedYesterday.count ?? 0) ? "good" : "neutral",
            },
          ]);

          setUrgencyItems([
            { label: "Active Queue", value: (activeSamples.data ?? []).length, href: "/dashboard/samples", tone: "good" },
            { label: "Pending Tests", value: pendingTests.count ?? 0, href: "/dashboard/results", tone: (pendingTests.count ?? 0) > 0 ? "warn" : "good" },
            { label: "Overdue Samples", value: overdueSamples.count ?? 0, href: "/dashboard/samples", tone: (overdueSamples.count ?? 0) > 0 ? "critical" : "good" },
          ]);

          setActionItems([
            {
              label: "Continue Active Sample",
              value: String((activeSamples.data ?? []).length),
              detail: "Resume assigned sample workflow",
              href: "/dashboard/samples",
              cta: "Open Samples",
            },
            {
              label: "Enter Test Results",
              value: String(pendingTests.count ?? 0),
              detail: "Move queue toward completion",
              href: "/dashboard/results",
              cta: "Enter Results",
            },
            {
              label: "Review Completed Work",
              value: String(completedToday.count ?? 0),
              detail: "Validate recent result submissions",
              href: "/dashboard/results",
              cta: "Review Work",
            },
          ]);

          setInsight({
            title: "AI Ops Insight",
            body:
              (overdueSamples.count ?? 0) > 0
                ? `${overdueSamples.count} samples are older than 3 hours. Prioritize those first to avoid TAT breach.`
                : "Sample queue is healthy. Continue progressing in_testing items to completion.",
          });

          setFocusTitle("My Active Samples");
          setFocusEmptyCta({ href: "/dashboard/results", label: "Open Result Entry" });
          setFocusRows(
            (activeSamples.data ?? []).map((row) => ({
              primary: row.sample_code,
              secondary: `${row.test_type} - ${formatDate(row.created_at)}`,
              status: row.status,
              href: "/dashboard/samples",
            }))
          );

          setRecentItems(
            (notificationRows.data ?? []).map((row) => ({
              title: row.title,
              subtitle: row.type,
              time: row.created_at,
            }))
          );
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [role, user?.id]);

  const urgencyToneClass = (tone: UrgencyItem["tone"]) => {
    if (tone === "good") return "border-emerald-900/50 bg-emerald-950/20 text-emerald-300";
    if (tone === "critical") return "border-red-900/50 bg-red-950/20 text-red-300";
    return "border-amber-900/50 bg-amber-950/20 text-amber-300";
  };

  return (
    <div>
      <PageHeader title="Dashboard" description="Live operational metrics for your laboratory." />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/60" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 ${metrics.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              trendText={metric.trendText}
              tone={metric.tone ?? "neutral"}
            />
          ))}
        </div>
      )}

      {!loading ? (
        <section className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/65 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">Urgency Radar</h2>
            <span className="text-xs text-slate-500">Role: {role}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {urgencyItems.map((item) => (
              <Link key={item.label} href={item.href} className={`rounded-xl border px-3 py-2 transition hover:opacity-90 ${urgencyToneClass(item.tone)}`}>
                <p className="text-xs">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/60" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Action Queue</h2>
              <span className="text-xs text-slate-500">{role}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {actionItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs text-slate-300">{item.label}</p>
                  {item.value ? <p className="mt-1 text-3xl font-semibold text-slate-100">{item.value}</p> : null}
                  {item.detail ? <p className="mt-1 text-xs text-slate-400">{item.detail}</p> : null}
                  <Link href={item.href} className="mt-2 inline-block text-xs text-blue-300 hover:text-blue-200">
                    {item.cta}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-100">Recent Activity</h2>
            {recentItems.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-5">
                <p className="text-sm text-slate-400">No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentItems.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2" title={formatDate(item.time)}>
                    <p className="text-sm font-medium text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-300">{item.subtitle}</p>
                    <p className="text-xs text-slate-400">{formatRelativeTime(item.time)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && insight ? (
        <section className="mt-4 rounded-2xl border border-blue-900/30 bg-gradient-to-r from-slate-900/90 to-blue-950/25 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Insight</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{insight.title}</p>
          <p className="mt-1 text-sm text-slate-300">{insight.body}</p>
        </section>
      ) : null}

      {!loading ? (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/65 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">{focusTitle}</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {focusRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Queue is clear.
                    {focusEmptyCta ? (
                      <Link href={focusEmptyCta.href} className="ml-2 text-blue-300 hover:text-blue-200">
                        {focusEmptyCta.label}
                      </Link>
                    ) : null}
                    {role === "admin" ? (
                      <Link href="/admin/audit-logs" className="ml-2 text-slate-300 hover:text-slate-100">
                        View Audit Logs
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ) : (
                focusRows.map((row, index) => (
                  <tr key={`${row.primary}-${index}`} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3">{row.primary}</td>
                    <td className="px-4 py-3 text-slate-400">{row.secondary}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs uppercase ${statusToneClass(row.status)}`}>{row.status}</span>
                      {row.status.toLowerCase().includes("overdue") ? (
                        <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={row.href} className="rounded-md border border-blue-800 px-2 py-1 text-xs text-blue-300 hover:border-blue-600">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
