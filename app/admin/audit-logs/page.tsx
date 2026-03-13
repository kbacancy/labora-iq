"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import {
  SurfaceSection,
  compactAccentButtonClassName,
  inputClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { AuditLog } from "@/src/types/database";

export default function AuditLogsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalLogs, setTotalLogs] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(from, to);
    const trimmed = search.trim();
    if (trimmed) {
      query = query.or(`action.ilike.%${trimmed}%,table_name.ilike.%${trimmed}%,record_id.ilike.%${trimmed}%`);
    }

    const { data, error: queryError, count } = await query;
    if (queryError) {
      setError(queryError.message);
      setLogs([]);
      setTotalLogs(0);
      setLoading(false);
      return;
    }

    setLogs((data ?? []) as AuditLog[]);
    setTotalLogs(count ?? 0);
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadLogs]);

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" description="Search the most recent governed events across workflow, access, and administrative changes." eyebrow="Governance trace" />
      <SurfaceSection eyebrow="Log query" title="Search recent events" description="Inspect governed events by action, table, or record reference." className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search action, table, or record id"
            className={inputClassName}
          />
          <button type="button" onClick={() => void loadLogs()} className={compactAccentButtonClassName}>
            Search Logs
          </button>
        </div>
      </SurfaceSection>

      <section className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>When</th>
              <th className={tableHeaderCellClassName}>Action</th>
              <th className={tableHeaderCellClassName}>Table</th>
              <th className={tableHeaderCellClassName}>Record</th>
              <th className={tableHeaderCellClassName}>User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  Loading audit logs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-red-300">
                  {error}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={tableRowClassName}>
                  <td className={tableMutedCellClassName}>{formatDate(log.timestamp)}</td>
                  <td className={tableCellClassName}>{log.action}</td>
                  <td className={tableCellClassName}>{log.table_name}</td>
                  <td className={tableMutedCellClassName}>{log.record_id ?? "-"}</td>
                  <td className={tableMutedCellClassName}>{log.user_id ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalLogs > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalLogs}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
