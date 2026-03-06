"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Toast } from "@/src/components/ui/Toast";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import { createAuditLog } from "@/src/lib/audit";
import type { Patient } from "@/src/types/database";

export default function PatientsPage() {
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
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from("patients").select("*").eq("is_archived", showArchived).order("created_at", { ascending: false });
    const trimmed = search.trim();
    if (trimmed) {
      query = query.or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setToast({ type: "error", message: queryError.message });
      setPatients([]);
    } else {
      setPatients(data ?? []);
    }
    setLoading(false);
  };

  const onToggleArchive = async (patient: Patient, nextArchived: boolean) => {
    setArchivingId(patient.id);
    const payload = nextArchived
      ? { is_archived: true, archived_at: new Date().toISOString(), archived_by: user?.id ?? null }
      : { is_archived: false, archived_at: null, archived_by: null };

    const { error: updateError } = await supabase.from("patients").update(payload).eq("id", patient.id);
    setArchivingId(null);

    if (updateError) {
      setError(updateError.message);
      setToast({ type: "error", message: updateError.message });
      await createAuditLog({
        userId: user?.id ?? null,
        action: nextArchived ? "patient_archive_failed" : "patient_restore_failed",
        tableName: "patients",
        recordId: patient.id,
      });
      return;
    }

    await createAuditLog({
      userId: user?.id ?? null,
      action: nextArchived ? "patient_archived" : "patient_restored",
      tableName: "patients",
      recordId: patient.id,
    });

    setPatients((current) => current.filter((item) => item.id !== patient.id));
    setToast({
      type: "success",
      message: nextArchived ? "Patient archived successfully." : "Patient restored successfully.",
    });
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
    const { count: linkedOrderCount, error: linkedOrderError } = await supabase
      .from("lab_orders")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", id);

    if (linkedOrderError) {
      setDeletingId(null);
      setError(linkedOrderError.message);
      setToast({ type: "error", message: linkedOrderError.message });
      await createAuditLog({
        userId: user?.id ?? null,
        action: "patient_delete_failed",
        tableName: "patients",
        recordId: id,
      });
      return;
    }

    if ((linkedOrderCount ?? 0) > 0) {
      setDeletingId(null);
      const message = "Cannot delete patient with existing orders. Archive instead.";
      setError(message);
      setToast({ type: "error", message });
      await createAuditLog({
        userId: user?.id ?? null,
        action: "patient_delete_blocked_has_orders",
        tableName: "patients",
        recordId: id,
      });
      return;
    }

    const { error: deleteError } = await supabase.from("patients").delete().eq("id", id);
    setDeletingId(null);

    if (deleteError) {
      const message = deleteError.message.includes("foreign key")
        ? "Cannot delete patient with existing orders. Archive instead."
        : deleteError.message;
      setError(message);
      setToast({ type: "error", message });
      await createAuditLog({
        userId: user?.id ?? null,
        action: "patient_delete_failed",
        tableName: "patients",
        recordId: id,
      });
      return;
    }

    await createAuditLog({
      userId: user?.id ?? null,
      action: "patient_deleted",
      tableName: "patients",
      recordId: id,
    });

    setPatients((current) => current.filter((patient) => patient.id !== id));
    setToast({ type: "success", message: "Patient deleted successfully." });
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    const timer = setTimeout(() => {
      void loadPatients();
    }, 0);
    return () => clearTimeout(timer);
  }, [user, refreshFlag, showArchived]);

  useEffect(() => {
    if (toastFlag === "created") {
      setToast({ type: "success", message: "Patient added successfully." });
      return;
    }
    if (toastFlag === "updated") {
      setToast({ type: "success", message: "Patient updated successfully." });
    }
  }, [toastFlag]);

  return (
    <RoleGate allowedRoles={["admin", "receptionist"]}>
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Patients" description="Manage patient records and demographics." actionHref="/dashboard/patients/new" actionLabel="Add Patient" />

      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or phone"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
        />
        <button
          onClick={loadPatients}
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-indigo-400"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowArchived((current) => !current)}
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-indigo-400"
        >
          {showArchived ? "Show Active" : "Show Archived"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900/80 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading patients...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No patients found. <Link href="/dashboard/patients/new" className="text-indigo-400">Add one</Link>.
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{patient.name}</td>
                  <td className="px-4 py-3">{patient.age}</td>
                  <td className="px-4 py-3">{patient.gender}</td>
                  <td className="px-4 py-3">{patient.phone}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(patient.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="rounded-md border border-indigo-700 px-2 py-1 text-xs text-indigo-300 transition hover:border-indigo-500"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onToggleArchive(patient, !patient.is_archived)}
                        disabled={archivingId === patient.id}
                        className="rounded-md border border-amber-700/70 px-2 py-1 text-xs text-amber-300 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                          className="rounded-md border border-red-800/70 px-2 py-1 text-xs text-red-300 transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </RoleGate>
  );
}
