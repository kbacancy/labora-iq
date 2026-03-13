"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import { Toast } from "@/src/components/ui/Toast";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import {
  compactAccentButtonClassName,
  compactButtonClassName,
  compactDangerButtonClassName,
  inputClassName,
  SurfaceSection,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";
import type { Patient } from "@/src/types/database";

export default function PatientsPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const refreshFlag = searchParams.get("refresh");
  const toastFlag = searchParams.get("toast");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPatients, setTotalPatients] = useState(0);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("is_archived", showArchived)
      .order("created_at", { ascending: false })
      .range(from, to);
    const trimmed = search.trim();
    if (trimmed) {
      query = query.or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
    }

    const { data, error: queryError, count } = await query;
    if (queryError) {
      setError(queryError.message);
      setToast({ type: "error", message: queryError.message });
      setPatients([]);
      setTotalPatients(0);
    } else {
      setPatients(data ?? []);
      setTotalPatients(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search, showArchived]);

  const onToggleArchive = async (patient: Patient, nextArchived: boolean) => {
    setArchivingId(patient.id);
    const payload = nextArchived
      ? { action: "set_archived", archived: true }
      : { action: "set_archived", archived: false };

    try {
      const response = await fetchWithAccessToken(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      setArchivingId(null);

      if (!response.ok) {
        setError(responsePayload.error ?? "Unable to update patient archive status.");
        setToast({ type: "error", message: responsePayload.error ?? "Unable to update patient archive status." });
        return;
      }

      const nextCount = Math.max(0, totalPatients - 1);
      const nextPage = nextCount > 0 && (page - 1) * pageSize >= nextCount ? Math.max(1, page - 1) : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        void loadPatients();
      }
      setToast({
        type: "success",
        message: responsePayload.message ?? (nextArchived ? "Patient archived successfully." : "Patient restored successfully."),
      });
    } catch (error) {
      setArchivingId(null);
      const message = error instanceof Error ? error.message : "Unable to update patient archive status.";
      setError(message);
      setToast({ type: "error", message });
      return;
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (role !== "admin") {
      return;
    }

    const confirmed = window.confirm(`Delete patient "${name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetchWithAccessToken(`/api/patients/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      setDeletingId(null);

      if (!response.ok) {
        setError(payload.error ?? "Unable to delete patient.");
        setToast({ type: "error", message: payload.error ?? "Unable to delete patient." });
        return;
      }

      const nextCount = Math.max(0, totalPatients - 1);
      const nextPage = nextCount > 0 && (page - 1) * pageSize >= nextCount ? Math.max(1, page - 1) : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        void loadPatients();
      }
      setToast({ type: "success", message: payload.message ?? "Patient deleted successfully." });
    } catch (error) {
      setDeletingId(null);
      const message = error instanceof Error ? error.message : "Unable to delete patient.";
      setError(message);
      setToast({ type: "error", message });
    }
  };

  const onLoadDemoPatients = async () => {
    setSeeding(true);
    setError(null);

    try {
      const response = await fetchWithAccessToken("/api/patients/seed", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      setSeeding(false);

      if (!response.ok) {
        const message = payload.error ?? "Unable to load demo patients.";
        setError(message);
        setToast({ type: "error", message });
        return;
      }

      setToast({ type: "success", message: payload.message ?? "Demo patients loaded." });
      setSearch("");
      setShowArchived(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await loadPatients();
      }
    } catch (error) {
      setSeeding(false);
      const message = error instanceof Error ? error.message : "Unable to load demo patients.";
      setError(message);
      setToast({ type: "error", message });
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    const timer = setTimeout(() => {
      void loadPatients();
    }, 0);
    return () => clearTimeout(timer);
  }, [user, refreshFlag, loadPatients]);

  useEffect(() => {
    if (toastFlag === "created") {
      const timer = setTimeout(() => {
        setToast({ type: "success", message: "Patient added successfully." });
      }, 0);
      return () => clearTimeout(timer);
    }
    if (toastFlag === "updated") {
      const timer = setTimeout(() => {
        setToast({ type: "success", message: "Patient updated successfully." });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [toastFlag]);

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Patients"
        description="Manage patient records, archive transitions, and demographic intake from one governed queue."
        actionHref="/dashboard/patients/new"
        actionLabel="Add Patient"
      />

      <SurfaceSection
        eyebrow="Directory controls"
        title="Patient registry"
        description="Search across active or archived patient records and take the next operational action directly from the list."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {role === "admin" ? (
              <button
                type="button"
                onClick={() => void onLoadDemoPatients()}
                disabled={seeding}
                className={compactAccentButtonClassName}
              >
                {seeding ? "Loading Demo Patients..." : "Load Demo Patients"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setShowArchived((current) => !current);
              }}
              className={compactButtonClassName}
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
          </div>
        }
        className="mb-5"
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search by name or phone"
            className={inputClassName}
          />
          <button type="button" onClick={() => void loadPatients()} className={compactAccentButtonClassName}>
            Search Registry
          </button>
        </div>
      </SurfaceSection>

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Name</th>
              <th className={tableHeaderCellClassName}>Age</th>
              <th className={tableHeaderCellClassName}>Gender</th>
              <th className={tableHeaderCellClassName}>Phone</th>
              <th className={tableHeaderCellClassName}>Created</th>
              <th className={tableHeaderCellClassName}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading patients...
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
                  No patients found.{" "}
                  <Link href="/dashboard/patients/new" className="text-blue-300 hover:text-blue-200">
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{patient.name}</td>
                  <td className={tableCellClassName}>{patient.age}</td>
                  <td className={tableCellClassName}>{patient.gender}</td>
                  <td className={tableCellClassName}>{patient.phone}</td>
                  <td className={tableMutedCellClassName}>{formatDate(patient.created_at)}</td>
                  <td className={tableCellClassName}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className={compactAccentButtonClassName}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onToggleArchive(patient, !patient.is_archived)}
                        disabled={archivingId === patient.id}
                        className={compactButtonClassName}
                      >
                        {archivingId === patient.id
                          ? (patient.is_archived ? "Restoring..." : "Archiving...")
                          : (patient.is_archived ? "Restore" : "Archive")}
                      </button>
                      {role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(patient.id, patient.name)}
                          disabled={deletingId === patient.id}
                          className={compactDangerButtonClassName}
                        >
                          {deletingId === patient.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </td>
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
      </div>
    </RoleGate>
  );
}
