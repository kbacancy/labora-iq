"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import type { AuditLog } from "@/src/types/database";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(200);
    const trimmed = search.trim();
    if (trimmed) {
      query = query.or(`action.ilike.%${trimmed}%,table_name.ilike.%${trimmed}%,record_id.ilike.%${trimmed}%`);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search action, table, or record id"
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-indigo-400"
        >
          Search
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-medium">Audit Logs</h2>
          <p className="text-sm text-gray-400">Most recent 200 events.</p>
        </div>

        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Record</th>
              <th className="px-4 py-3 font-medium">User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading audit logs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3 text-gray-400">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{log.table_name}</td>
                  <td className="px-4 py-3 text-gray-400">{log.record_id ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-400">{log.user_id ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
