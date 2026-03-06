"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import type { AuditLog, CompliancePolicy, Profile } from "@/src/types/database";
import { useAuth } from "@/src/context/AuthContext";

const toCsvValue = (value: string | number | null | undefined) => {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) => {
  const body = [
    headers.map((header) => toCsvValue(header)).join(","),
    ...rows.map((row) => row.map((cell) => toCsvValue(cell)).join(",")),
  ].join("\n");

  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function CompliancePage() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<CompliancePolicy | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditTable, setAuditTable] = useState("");
  const [exportingAudit, setExportingAudit] = useState(false);
  const [exportingAccess, setExportingAccess] = useState(false);
  const [draft, setDraft] = useState({
    audit_log_retention_days: 365,
    report_retention_days: 2555,
    access_review_frequency_days: 30,
  });

  const loadPolicy = async () => {
    setLoadingPolicy(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("compliance_policies")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoadingPolicy(false);
      return;
    }

    const row = (data as CompliancePolicy | null) ?? null;
    setPolicy(row);
    setDraft({
      audit_log_retention_days: row?.audit_log_retention_days ?? 365,
      report_retention_days: row?.report_retention_days ?? 2555,
      access_review_frequency_days: row?.access_review_frequency_days ?? 30,
    });
    setLoadingPolicy(false);
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const savePolicy = async () => {
    setSavingPolicy(true);
    setError(null);
    setMessage(null);

    const payload = {
      singleton: true,
      audit_log_retention_days: Number(draft.audit_log_retention_days),
      report_retention_days: Number(draft.report_retention_days),
      access_review_frequency_days: Number(draft.access_review_frequency_days),
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    const query = policy?.id
      ? supabase.from("compliance_policies").update(payload).eq("id", policy.id)
      : supabase.from("compliance_policies").insert(payload);

    const { error: saveError } = await query;
    setSavingPolicy(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Compliance retention policy updated.");
    await loadPolicy();
  };

  const exportAuditCsv = async () => {
    setExportingAudit(true);
    setError(null);
    setMessage(null);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(5000);

    if (auditFrom) {
      query = query.gte("timestamp", new Date(auditFrom).toISOString());
    }
    if (auditTo) {
      query = query.lte("timestamp", new Date(auditTo).toISOString());
    }
    if (auditAction.trim()) {
      query = query.ilike("action", `%${auditAction.trim()}%`);
    }
    if (auditTable.trim()) {
      query = query.ilike("table_name", `%${auditTable.trim()}%`);
    }

    const { data, error: queryError } = await query;
    setExportingAudit(false);

    if (queryError) {
      setError(queryError.message);
      return;
    }

    const rows = (data ?? []) as AuditLog[];
    downloadCsv(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ["timestamp", "action", "table_name", "record_id", "user_id"],
      rows.map((log) => [log.timestamp, log.action, log.table_name, log.record_id, log.user_id])
    );
    setMessage(`Exported ${rows.length} audit log rows.`);
  };

  const exportAccessReviewCsv = async () => {
    setExportingAccess(true);
    setError(null);
    setMessage(null);

    const [{ data: profileRows, error: profileError }, { data: logRows, error: logError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,created_at").order("created_at", { ascending: true }),
      supabase.from("audit_logs").select("user_id,timestamp").order("timestamp", { ascending: false }).limit(5000),
    ]);

    if (profileError || logError) {
      setExportingAccess(false);
      setError(profileError?.message ?? logError?.message ?? "Unable to build access review report.");
      return;
    }

    const lastActivityByUser = new Map<string, string>();
    for (const row of (logRows ?? []) as Array<Pick<AuditLog, "user_id" | "timestamp">>) {
      if (!row.user_id || lastActivityByUser.has(row.user_id)) {
        continue;
      }
      lastActivityByUser.set(row.user_id, row.timestamp);
    }

    const now = Date.now();
    const rows = ((profileRows ?? []) as Profile[]).map((profile) => {
      const lastSeen = lastActivityByUser.get(profile.id) ?? null;
      const daysSinceLastActivity = lastSeen ? Math.floor((now - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)) : null;
      const riskFlag = daysSinceLastActivity == null || daysSinceLastActivity > 90 ? "review_required" : "ok";
      return [
        profile.id,
        profile.full_name,
        profile.role,
        profile.created_at,
        lastSeen,
        daysSinceLastActivity,
        riskFlag,
      ];
    });

    downloadCsv(
      `access-review-${new Date().toISOString().slice(0, 10)}.csv`,
      ["user_id", "full_name", "role", "created_at", "last_activity_at", "days_since_last_activity", "status"],
      rows
    );
    setExportingAccess(false);
    setMessage(`Exported access review for ${rows.length} users.`);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Retention Policies</h2>
        <p className="mb-4 text-sm text-gray-400">Set data retention targets used by compliance operations.</p>
        {loadingPolicy ? (
          <p className="text-sm text-gray-400">Loading policy...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-gray-300">
              Audit Log Retention (days)
              <input
                type="number"
                value={draft.audit_log_retention_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, audit_log_retention_days: Number(event.target.value || 0) }))
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-300">
              Report Retention (days)
              <input
                type="number"
                value={draft.report_retention_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, report_retention_days: Number(event.target.value || 0) }))
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-300">
              Access Review Frequency (days)
              <input
                type="number"
                value={draft.access_review_frequency_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, access_review_frequency_days: Number(event.target.value || 0) }))
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void savePolicy()}
            disabled={savingPolicy || loadingPolicy}
            className="rounded-lg border border-indigo-700 px-4 py-2 text-sm text-indigo-300 transition hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPolicy ? "Saving..." : "Save Policy"}
          </button>
          {policy?.updated_at ? <p className="text-xs text-gray-500">Last updated: {formatDate(policy.updated_at)}</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Audit Export</h2>
        <p className="mb-4 text-sm text-gray-400">Export up to 5,000 audit rows as CSV with optional filters.</p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-gray-300">
            From
            <input
              type="datetime-local"
              value={auditFrom}
              onChange={(event) => setAuditFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-300">
            To
            <input
              type="datetime-local"
              value={auditTo}
              onChange={(event) => setAuditTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-300">
            Action contains
            <input
              value={auditAction}
              onChange={(event) => setAuditAction(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-300">
            Table contains
            <input
              value={auditTable}
              onChange={(event) => setAuditTable(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void exportAuditCsv()}
          disabled={exportingAudit}
          className="mt-4 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportingAudit ? "Exporting..." : "Export Audit CSV"}
        </button>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Access Review Report</h2>
        <p className="mb-4 text-sm text-gray-400">
          Export user-role access review with last observed activity from audit logs.
        </p>
        <button
          type="button"
          onClick={() => void exportAccessReviewCsv()}
          disabled={exportingAccess}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportingAccess ? "Building..." : "Export Access Review CSV"}
        </button>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </div>
  );
}
