"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import {
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { Patient } from "@/src/types/database";

export default function ArchivedPatientsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPatients, setTotalPatients] = useState(0);

  const loadArchivedPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: queryError, count } = await supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("is_archived", true)
      .order("archived_at", { ascending: false })
      .range(from, to);

    if (queryError) {
      setError(queryError.message);
      setPatients([]);
      setTotalPatients(0);
      setLoading(false);
      return;
    }

    setPatients(data ?? []);
    setTotalPatients(count ?? 0);
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadArchivedPatients();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadArchivedPatients]);

  return (
    <div>
      <PageHeader title="Archived Patients" description="Review patient records removed from active workflow surfaces." eyebrow="Governance archive" />
      <section className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Name</th>
              <th className={tableHeaderCellClassName}>Age</th>
              <th className={tableHeaderCellClassName}>Gender</th>
              <th className={tableHeaderCellClassName}>Phone</th>
              <th className={tableHeaderCellClassName}>Archived At</th>
              <th className={tableHeaderCellClassName}>Archived By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading archived patients...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-red-300">
                  {error}
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No archived patients.
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{patient.name}</td>
                  <td className={tableCellClassName}>{patient.age}</td>
                  <td className={tableCellClassName}>{patient.gender}</td>
                  <td className={tableCellClassName}>{patient.phone}</td>
                  <td className={tableMutedCellClassName}>{patient.archived_at ? formatDate(patient.archived_at) : "-"}</td>
                  <td className={tableMutedCellClassName}>{patient.archived_by ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalPatients > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalPatients}
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
