"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { LabTest } from "@/src/types/database";

export default function TestsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTests = async () => {
    setLoading(true);
    setError(null);

    const orderedQuery = await supabase.from("tests").select("*").order("created_at", { ascending: false });
    const missingCreatedAt = Boolean(
      orderedQuery.error?.message?.includes("created_at") &&
        orderedQuery.error?.message?.includes("does not exist")
    );

    const fallbackQuery = missingCreatedAt
      ? await supabase.from("tests").select("*").order("test_name", { ascending: true })
      : null;

    const data = fallbackQuery?.data ?? orderedQuery.data;
    const queryError = fallbackQuery?.error ?? orderedQuery.error;

    if (queryError) {
      setError(queryError.message);
      setTests([]);
    } else {
      setTests(data ?? []);
    }
    setLoading(false);
  };

  const onDelete = async (id: string) => {
    const { error: deleteError } = await supabase.from("tests").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadTests();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTests();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader title="Test Catalog" description="Configure available lab tests and pricing." actionHref="/dashboard/tests/new" actionLabel="Add Test" />

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Test Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Reference Range</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Loading tests...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No tests configured.
                </td>
              </tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{test.test_name}</td>
                  <td className="px-4 py-3">{test.category ?? "-"}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(test.price))}</td>
                  <td className="px-4 py-3">{test.reference_range ?? test.normal_range}</td>
                  <td className="px-4 py-3">{test.units ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-400">{test.created_at ? formatDate(test.created_at) : "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(test.id)}
                      className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-300 transition hover:border-red-600"
                    >
                      Delete
                    </button>
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
