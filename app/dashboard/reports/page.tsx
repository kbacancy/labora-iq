"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";

interface ReportView {
  id: string;
  sample_id: string | null;
  order_id: string | null;
  file_url: string;
  approved_by: string | null;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setReports([]);
      setLoading(false);
      return;
    }

    setReports((data ?? []) as ReportView[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadReports();
  }, []);

  return (
    <RoleGate allowedRoles={["admin", "technician"]}>
      <PageHeader title="Reports" description="Stored generated reports and download history." />

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Report ID</th>
              <th className="px-4 py-3 font-medium">Sample</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading reports...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No reports stored yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{report.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{report.sample_id?.slice(0, 8) ?? "-"}</td>
                  <td className="px-4 py-3">{report.order_id?.slice(0, 8) ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(report.created_at)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-indigo-700 px-2 py-1 text-xs text-indigo-300 transition hover:border-indigo-500"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
