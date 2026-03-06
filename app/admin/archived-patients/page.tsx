"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import type { Patient } from "@/src/types/database";

export default function ArchivedPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArchivedPatients = async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("patients")
      .select("*")
      .eq("is_archived", true)
      .order("archived_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setPatients([]);
      setLoading(false);
      return;
    }

    setPatients(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadArchivedPatients();
  }, []);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-lg font-medium">Archived Patients</h2>
        <p className="text-sm text-gray-400">Patients marked as archived from operational views.</p>
      </div>

      <table className="min-w-full text-sm">
        <thead className="border-b border-gray-800 text-left text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Age</th>
            <th className="px-4 py-3 font-medium">Gender</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Archived At</th>
            <th className="px-4 py-3 font-medium">Archived By</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                Loading archived patients...
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
                No archived patients.
              </td>
            </tr>
          ) : (
            patients.map((patient) => (
              <tr key={patient.id} className="border-t border-gray-800 text-gray-200">
                <td className="px-4 py-3">{patient.name}</td>
                <td className="px-4 py-3">{patient.age}</td>
                <td className="px-4 py-3">{patient.gender}</td>
                <td className="px-4 py-3">{patient.phone}</td>
                <td className="px-4 py-3 text-gray-400">{patient.archived_at ? formatDate(patient.archived_at) : "-"}</td>
                <td className="px-4 py-3 text-gray-400">{patient.archived_by ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
