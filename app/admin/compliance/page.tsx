"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import type { AuditLog, CompliancePolicy, Profile } from "@/src/types/database";
import { auditExportFiltersSchema, compliancePolicySchema } from "@/src/lib/validation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import {
  SurfaceSection,
  compactButtonClassName,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  successTextClassName,
} from "@/src/components/ui/surface";

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

  const getAccessToken = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }, []);

  const loadPolicy = useCallback(async () => {
    setLoadingPolicy(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("No active session token.");
      setLoadingPolicy(false);
      return;
    }

    const response = await fetch("/api/admin/compliance", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      data?: CompliancePolicy | null;
    };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load compliance policy.");
      setLoadingPolicy(false);
      return;
    }

    const row = payload.data ?? null;
    setPolicy(row);
    setDraft({
      audit_log_retention_days: row?.audit_log_retention_days ?? 365,
      report_retention_days: row?.report_retention_days ?? 2555,
      access_review_frequency_days: row?.access_review_frequency_days ?? 30,
    });
    setLoadingPolicy(false);
  }, [getAccessToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPolicy();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPolicy]);

  const savePolicy = async () => {
    const parsed = compliancePolicySchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid compliance policy.");
      return;
    }

    setSavingPolicy(true);
    setError(null);
    setMessage(null);

    const token = await getAccessToken();
    if (!token) {
      setSavingPolicy(false);
      setError("No active session token.");
      return;
    }

    const response = await fetch("/api/admin/compliance", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setSavingPolicy(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to update compliance policy.");
      return;
    }

    setMessage(payload.message ?? "Compliance retention policy updated.");
    await loadPolicy();
  };

  const exportAuditCsv = async () => {
    const parsed = auditExportFiltersSchema.safeParse({
      auditFrom,
      auditTo,
      auditAction,
      auditTable,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid audit export filters.");
      return;
    }

    setExportingAudit(true);
    setError(null);
    setMessage(null);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(5000);

    if (parsed.data.auditFrom) {
      query = query.gte("timestamp", new Date(parsed.data.auditFrom).toISOString());
    }
    if (parsed.data.auditTo) {
      query = query.lte("timestamp", new Date(parsed.data.auditTo).toISOString());
    }
    if (parsed.data.auditAction) {
      query = query.ilike("action", `%${parsed.data.auditAction}%`);
    }
    if (parsed.data.auditTable) {
      query = query.ilike("table_name", `%${parsed.data.auditTable}%`);
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
      <PageHeader title="Compliance" description="Manage retention policy, audit export, and access review reporting from the governance surface." eyebrow="Governance controls" />

      <SurfaceSection eyebrow="Retention policy" title="Retention targets" description="Set the target windows that drive compliance operations and review cadence.">
        {loadingPolicy ? (
          <p className="text-sm text-slate-400">Loading policy...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className={fieldLabelClassName}>Audit log retention (days)</span>
              <input
                type="number"
                value={draft.audit_log_retention_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, audit_log_retention_days: Number(event.target.value || 0) }))
                }
                className={inputClassName}
              />
            </label>
            <label>
              <span className={fieldLabelClassName}>Report retention (days)</span>
              <input
                type="number"
                value={draft.report_retention_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, report_retention_days: Number(event.target.value || 0) }))
                }
                className={inputClassName}
              />
            </label>
            <label>
              <span className={fieldLabelClassName}>Access review frequency (days)</span>
              <input
                type="number"
                value={draft.access_review_frequency_days}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, access_review_frequency_days: Number(event.target.value || 0) }))
                }
                className={inputClassName}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => void savePolicy()} disabled={savingPolicy || loadingPolicy} className={primaryButtonClassName}>
            {savingPolicy ? "Saving..." : "Save Policy"}
          </button>
          {policy?.updated_at ? <p className="text-xs text-slate-500">Last updated: {formatDate(policy.updated_at)}</p> : null}
        </div>
      </SurfaceSection>

      <SurfaceSection eyebrow="Audit export" title="Export governed activity" description="Download up to 5,000 audit rows with focused filters for review or evidence packages.">
        <div className="grid gap-3 md:grid-cols-4">
          <label>
            <span className={fieldLabelClassName}>From</span>
            <input
              type="datetime-local"
              value={auditFrom}
              onChange={(event) => setAuditFrom(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label>
            <span className={fieldLabelClassName}>To</span>
            <input
              type="datetime-local"
              value={auditTo}
              onChange={(event) => setAuditTo(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label>
            <span className={fieldLabelClassName}>Action contains</span>
            <input
              value={auditAction}
              onChange={(event) => setAuditAction(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label>
            <span className={fieldLabelClassName}>Table contains</span>
            <input
              value={auditTable}
              onChange={(event) => setAuditTable(event.target.value)}
              className={inputClassName}
            />
          </label>
        </div>
        <button type="button" onClick={() => void exportAuditCsv()} disabled={exportingAudit} className={`mt-4 ${compactButtonClassName}`}>
          {exportingAudit ? "Exporting..." : "Export Audit CSV"}
        </button>
      </SurfaceSection>

      <SurfaceSection eyebrow="Access review" title="Export access review report" description="Generate a role-access review with last-seen activity to support periodic governance checks.">
        <p className="mb-4 text-sm text-slate-400">
          Export user-role access review with last observed activity from audit logs.
        </p>
        <button type="button" onClick={() => void exportAccessReviewCsv()} disabled={exportingAccess} className={compactButtonClassName}>
          {exportingAccess ? "Building..." : "Export Access Review CSV"}
        </button>
      </SurfaceSection>

      {error ? <p className={errorTextClassName}>{error}</p> : null}
      {message ? <p className={successTextClassName}>{message}</p> : null}
    </div>
  );
}
