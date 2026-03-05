"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";

interface InventoryItem {
  id: string;
  reagent_name: string;
  quantity: number;
  reorder_level: number;
  updated_at: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reagent_name: "",
    quantity: "",
    reorder_level: "",
  });

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("inventory")
      .select("*")
      .order("updated_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as InventoryItem[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const upsertItem = async () => {
    const name = form.reagent_name.trim();
    const quantity = Number(form.quantity);
    const reorderLevel = Number(form.reorder_level);

    if (!name || Number.isNaN(quantity) || Number.isNaN(reorderLevel)) {
      setError("Reagent name, quantity, and reorder level are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: upsertError } = await supabase.from("inventory").upsert(
      {
        reagent_name: name,
        quantity,
        reorder_level: reorderLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reagent_name" }
    );

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setForm({ reagent_name: "", quantity: "", reorder_level: "" });
    await loadItems();
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader title="Inventory" description="Track reagent levels and reorder thresholds." />

      <section className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Add or Update Reagent</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={form.reagent_name}
            onChange={(event) => setForm((current) => ({ ...current, reagent_name: event.target.value }))}
            placeholder="Reagent name"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="Quantity"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.reorder_level}
            onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))}
            placeholder="Reorder level"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void upsertItem()}
          disabled={saving}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Reagent"}
        </button>
      </section>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Reagent</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Reorder Level</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading inventory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No inventory items configured.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{item.reagent_name}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.reorder_level}</td>
                  <td className="px-4 py-3">
                    {item.quantity <= item.reorder_level ? (
                      <span className="rounded-md bg-red-600/20 px-2 py-1 text-xs text-red-300">Reorder</span>
                    ) : (
                      <span className="rounded-md bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(item.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
