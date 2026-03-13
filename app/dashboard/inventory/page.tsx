"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { RoleGate } from "@/src/components/auth/RoleGate";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";
import { supabase } from "@/src/lib/supabase";
import { formatDate } from "@/src/lib/format";
import {
  StatusBadge,
  SurfaceSection,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";

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
    const timer = setTimeout(() => {
      void loadItems();
    }, 0);

    return () => clearTimeout(timer);
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
    try {
      const response = await fetchWithAccessToken("/api/inventory", {
        method: "PUT",
        body: JSON.stringify({
          reagent_name: name,
          quantity,
          reorder_level: reorderLevel,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setSaving(false);

      if (!response.ok) {
        setError(payload.error ?? "Unable to update inventory.");
        return;
      }

      setForm({ reagent_name: "", quantity: "", reorder_level: "" });
      await loadItems();
    } catch (error) {
      setSaving(false);
      setError(error instanceof Error ? error.message : "Unable to update inventory.");
    }
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <PageHeader title="Inventory" description="Track reagent levels, monitor replenishment risk, and keep supply readiness visible." />

      <SurfaceSection
        eyebrow="Supply command"
        title="Add or update reagent"
        description="Maintain current stock, reorder thresholds, and the live replenishment posture for the lab."
        className="mb-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className={fieldLabelClassName}>Reagent name</span>
            <input
              value={form.reagent_name}
              onChange={(event) => setForm((current) => ({ ...current, reagent_name: event.target.value }))}
              placeholder="Reagent name"
              className={inputClassName}
            />
          </label>
          <label>
            <span className={fieldLabelClassName}>Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              placeholder="Quantity"
              className={inputClassName}
            />
          </label>
          <label>
            <span className={fieldLabelClassName}>Reorder level</span>
            <input
              type="number"
              value={form.reorder_level}
              onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))}
              placeholder="Reorder level"
              className={inputClassName}
            />
          </label>
        </div>
        <button type="button" onClick={() => void upsertItem()} disabled={saving} className={`mt-5 ${primaryButtonClassName}`}>
          {saving ? "Saving..." : "Save Reagent"}
        </button>
      </SurfaceSection>

      {error ? <p className={`mb-3 ${errorTextClassName}`}>{error}</p> : null}

      <div className={tableWrapperClassName}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Reagent</th>
              <th className={tableHeaderCellClassName}>Quantity</th>
              <th className={tableHeaderCellClassName}>Reorder Level</th>
              <th className={tableHeaderCellClassName}>Status</th>
              <th className={tableHeaderCellClassName}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  Loading inventory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No inventory items configured.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className={tableRowClassName}>
                  <td className={tableCellClassName}>{item.reagent_name}</td>
                  <td className={tableCellClassName}>{item.quantity}</td>
                  <td className={tableCellClassName}>{item.reorder_level}</td>
                  <td className={tableCellClassName}>
                    {item.quantity <= item.reorder_level ? (
                      <StatusBadge tone="danger">Reorder</StatusBadge>
                    ) : (
                      <StatusBadge tone="good">OK</StatusBadge>
                    )}
                  </td>
                  <td className={tableMutedCellClassName}>{formatDate(item.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
