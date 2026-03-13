"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency, formatDate } from "@/src/lib/format";
import {
  compactAccentButtonClassName,
  compactDangerButtonClassName,
  successTextClassName,
  errorTextClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { LabTest } from "@/src/types/database";

export default function TestsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalTests, setTotalTests] = useState(0);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const orderedQuery = await supabase
      .from("tests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    const missingCreatedAt = Boolean(
      orderedQuery.error?.message?.includes("created_at") &&
        orderedQuery.error?.message?.includes("does not exist")
    );

    const fallbackQuery = missingCreatedAt
      ? await supabase
          .from("tests")
          .select("*", { count: "exact" })
          .order("test_name", { ascending: true })
          .range(from, to)
      : null;

    const data = fallbackQuery?.data ?? orderedQuery.data;
    const queryError = fallbackQuery?.error ?? orderedQuery.error;
    const totalCount = fallbackQuery?.count ?? orderedQuery.count ?? 0;

    if (queryError) {
      setError(queryError.message);
      setTests([]);
      setTotalTests(0);
    } else {
      setTests(data ?? []);
      setTotalTests(totalCount);
    }
    setLoading(false);
  }, [page, pageSize]);

  const onDelete = async (id: string) => {
    try {
      setMessage(null);
      const response = await fetchWithAccessToken(`/api/tests/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to delete test.");
        return;
      }
      if (tests.length === 1 && page > 1) {
        setPage((current) => current - 1);
        return;
      }
      await loadTests();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete test.");
    }
  };

  const onSeedStarterCatalog = async () => {
    setSeeding(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetchWithAccessToken("/api/tests/seed", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to load starter test catalog.");
        return;
      }
      setMessage(payload.message ?? "Starter catalog loaded.");
      if (page !== 1) {
        setPage(1);
        return;
      }
      await loadTests();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load starter test catalog.");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTests();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTests]);

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader
        title="Test Catalog"
        description="Configure the diagnostic menu, commercial values, and reference ranges used across workflow execution."
        actionHref="/dashboard/tests/new"
        actionLabel="Add Test"
      />

      {error ? <p className={`mb-4 ${errorTextClassName}`}>{error}</p> : null}
      {message ? <p className={`mb-4 ${successTextClassName}`}>{message}</p> : null}

      {tests.length === 0 && !loading ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.26em] text-blue-300">Starter catalog</p>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              Load 20 common laboratory tests with categories, units, reference ranges, and starter pricing.
            </p>
          </div>
          <button type="button" onClick={() => void onSeedStarterCatalog()} disabled={seeding} className={compactAccentButtonClassName}>
            {seeding ? "Loading..." : "Load Starter Catalog"}
          </button>
        </div>
      ) : null}

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Test Name</th>
              <th className={tableHeaderCellClassName}>Category</th>
              <th className={tableHeaderCellClassName}>Price</th>
              <th className={tableHeaderCellClassName}>Reference Range</th>
              <th className={tableHeaderCellClassName}>Units</th>
              <th className={tableHeaderCellClassName}>Created</th>
              <th className={tableHeaderCellClassName}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  Loading tests...
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  No tests configured. Use the starter catalog loader above or add tests manually.
                </td>
              </tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{test.test_name}</td>
                  <td className={tableCellClassName}>{test.category ?? "-"}</td>
                  <td className={tableCellClassName}>{formatCurrency(Number(test.price))}</td>
                  <td className={tableCellClassName}>{test.reference_range ?? test.normal_range}</td>
                  <td className={tableCellClassName}>{test.units ?? "-"}</td>
                  <td className={tableMutedCellClassName}>{test.created_at ? formatDate(test.created_at) : "-"}</td>
                  <td className={tableCellClassName}>
                    <button
                      type="button"
                      onClick={() => void onDelete(test.id)}
                      className={compactDangerButtonClassName}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && totalTests > 0 ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalTests}
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
