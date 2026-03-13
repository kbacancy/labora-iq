"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import {
  compactAccentButtonClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";

interface ReportView {
  id: string;
  sample_id: string | null;
  order_id: string | null;
  file_url: string;
  approved_by: string | null;
  created_at: string;
  sample_label?: string;
  patient_name?: string;
}

interface ReportOrderLookupRow {
  id: string;
  patients: { name: string }[] | { name: string } | null;
}

export default function ReportsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const [reports, setReports] = useState<ReportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalReports, setTotalReports] = useState(0);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: queryError, count } = await supabase
      .from("reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryError) {
      setError(queryError.message);
      setReports([]);
      setTotalReports(0);
      setLoading(false);
      return;
    }

    const reportRows = (data ?? []) as ReportView[];
    const sampleIds = [...new Set(reportRows.map((report) => report.sample_id).filter(Boolean))] as string[];
    const orderIds = [...new Set(reportRows.map((report) => report.order_id).filter(Boolean))] as string[];

    const [sampleLookup, orderLookup] = await Promise.all([
      sampleIds.length > 0
        ? supabase.from("samples").select("id,sample_code").in("id", sampleIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length > 0
        ? supabase.from("lab_orders").select("id,patients(name)").in("id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const sampleCodeMap = new Map((sampleLookup.data ?? []).map((row) => [row.id, row.sample_code]));
    const patientNameMap = new Map(
      ((orderLookup.data ?? []) as ReportOrderLookupRow[]).map((row) => {
        const patientField = row.patients;
        return [
          row.id,
          Array.isArray(patientField) ? patientField[0]?.name ?? "Patient linked" : patientField?.name ?? "Patient linked",
        ];
      })
    );

    setReports(
      reportRows.map((report) => ({
        ...report,
        sample_label: report.sample_id ? sampleCodeMap.get(report.sample_id) ?? "Sample linked" : "-",
        patient_name: report.order_id ? patientNameMap.get(report.order_id) ?? "Patient linked" : "-",
      }))
    );
    setTotalReports(count ?? 0);
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReports();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReports]);

  return (
    <RoleGate allowedRoles={["admin", "technician"]}>
      <PageHeader title="Reports" description="Stored report artifacts, release timestamps, and download access for approved work." />

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Patient</th>
              <th className={tableHeaderCellClassName}>Sample</th>
              <th className={tableHeaderCellClassName}>Report Context</th>
              <th className={tableHeaderCellClassName}>Created</th>
              <th className={tableHeaderCellClassName}>File</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  Loading reports...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-red-300">
                  {error}
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No reports stored yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{report.patient_name ?? "-"}</td>
                  <td className={tableCellClassName}>{report.sample_label ?? "-"}</td>
                  <td className={tableMutedCellClassName}>Approved report artifact</td>
                  <td className={tableMutedCellClassName}>{formatDate(report.created_at)}</td>
                  <td className={tableCellClassName}>
                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className={compactAccentButtonClassName}
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalReports > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalReports}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        ) : null}
      </div>
    </RoleGate>
  );
}
