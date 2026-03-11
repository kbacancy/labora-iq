"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/src/context/AuthContext";
import type { Role } from "@/src/types/database";
import { formatDate } from "@/src/lib/format";
import { supabase } from "@/src/lib/supabase";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  is_disabled: boolean;
}

interface LabSettings {
  id: string;
  lab_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  accreditation: string | null;
  report_footer: string | null;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

const userSchema = z.object({
  provisioning: z.enum(["invite", "password"]),
  email: z.email("Enter a valid email."),
  password: z.string().optional(),
  full_name: z.string().min(2, "Full name is required."),
  role: z.enum(["admin", "receptionist", "technician"]),
}).superRefine((values, ctx) => {
  if (values.provisioning === "password" && (!values.password || values.password.length < 8)) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Password must be at least 8 characters.",
    });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LabSettings | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    lab_name: "",
    address: "",
    phone: "",
    email: "",
    accreditation: "",
    report_footer: "",
  });

  const { register, handleSubmit, reset, watch } = useForm<UserFormValues>({
    defaultValues: { provisioning: "invite", email: "", password: "", full_name: "", role: "receptionist" },
  });
  const provisioningMode = watch("provisioning");

  const loadUsers = async () => {
    if (role !== "admin") {
      return;
    }

    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("No active session token.");
      setUsers([]);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load users.");
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers(payload.data ?? []);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data, error: settingsError } = await supabase
      .from("lab_settings")
      .select("id,lab_name,address,phone,email,logo_url,accreditation,report_footer")
      .eq("singleton", true)
      .maybeSingle();

    if (settingsError) {
      setError(settingsError.message);
      return;
    }

    if (!data) {
      setSettings(null);
      setSettingsForm({
        lab_name: "",
        address: "",
        phone: "",
        email: "",
        accreditation: "",
        report_footer: "",
      });
      return;
    }

    setSettings(data);
    setSettingsForm({
      lab_name: data.lab_name ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      accreditation: data.accreditation ?? "",
      report_footer: data.report_footer ?? "",
    });
  };

  const loadOrganization = async () => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    const response = await fetch("/api/admin/organization", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load organization.");
      return;
    }

    const org = payload.data as Organization;
    setOrganization(org);
    setOrganizationName(org?.name ?? "");
  };

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
      void loadSettings();
      void loadOrganization();
    }, 0);
    return () => clearTimeout(timer);
  }, [role]);

  const saveOrganization = async () => {
    const trimmed = organizationName.trim();
    if (trimmed.length < 2) {
      setError("Organization name must be at least 2 characters.");
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError("No active session token.");
      return;
    }

    setOrganizationSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: trimmed }),
    });
    const payload = await response.json();
    setOrganizationSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to update organization.");
      return;
    }

    setSuccess("Organization profile updated.");
    await loadOrganization();
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      singleton: true,
      lab_name: settingsForm.lab_name.trim() || "LaboraIQ Laboratory",
      address: settingsForm.address.trim() || null,
      phone: settingsForm.phone.trim() || null,
      email: settingsForm.email.trim() || null,
      accreditation: settingsForm.accreditation.trim() || null,
      report_footer: settingsForm.report_footer.trim() || null,
    };

    const query = settings?.id
      ? supabase.from("lab_settings").update(payload).eq("id", settings.id)
      : supabase.from("lab_settings").insert(payload);

    const { error: saveError } = await query;
    setSettingsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setSuccess("Lab settings updated.");
    await loadSettings();
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = userSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const token = await getAccessToken();
    if (!token) {
      setSubmitting(false);
      setError("No active session token.");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to create user.");
      return;
    }

    setSuccess(payload.message ?? "Action completed.");
    reset({ provisioning: values.provisioning, email: "", password: "", full_name: "", role: "receptionist" });
    await loadUsers();
  });

  const updateUserRole = async (userId: string, nextRole: Role) => {
    setBusyUserId(userId);
    setError(null);
    setSuccess(null);
    const token = await getAccessToken();
    if (!token) {
      setBusyUserId(null);
      setError("No active session token.");
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "update_role", role: nextRole }),
    });
    const payload = await response.json();
    setBusyUserId(null);

    if (!response.ok) {
      setError(payload.error ?? "Unable to update role.");
      return;
    }
    setSuccess("Role updated.");
    await loadUsers();
  };

  const toggleUserStatus = async (userId: string, disabled: boolean) => {
    setBusyUserId(userId);
    setError(null);
    setSuccess(null);
    const token = await getAccessToken();
    if (!token) {
      setBusyUserId(null);
      setError("No active session token.");
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "set_disabled", disabled }),
    });
    const payload = await response.json();
    setBusyUserId(null);

    if (!response.ok) {
      setError(payload.error ?? "Unable to change user status.");
      return;
    }
    setSuccess(disabled ? "User disabled." : "User enabled.");
    await loadUsers();
  };

  const sendResetLink = async (userId: string) => {
    setBusyUserId(userId);
    setError(null);
    setSuccess(null);
    const token = await getAccessToken();
    if (!token) {
      setBusyUserId(null);
      setError("No active session token.");
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();
    setBusyUserId(null);

    if (!response.ok) {
      setError(payload.error ?? "Unable to send reset email.");
      return;
    }
    setSuccess("Password reset email sent.");
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user permanently?")) {
      return;
    }

    setBusyUserId(userId);
    setError(null);
    setSuccess(null);
    const token = await getAccessToken();
    if (!token) {
      setBusyUserId(null);
      setError("No active session token.");
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();
    setBusyUserId(null);

    if (!response.ok) {
      setError(payload.error ?? "Unable to delete user.");
      return;
    }
    setSuccess("User deleted.");
    await loadUsers();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Organization Profile</h2>
        <p className="mb-4 text-sm text-gray-400">Manage tenant identity for this laboratory workspace.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Organization name"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-400">
            Created: {organization?.created_at ? formatDate(organization.created_at) : "-"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void saveOrganization()}
          disabled={organizationSaving}
          className="mt-4 rounded-lg border border-indigo-700 px-4 py-2 text-sm text-indigo-300 transition hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {organizationSaving ? "Saving..." : "Save Organization"}
        </button>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-medium">Lab Report Settings</h2>
        <p className="mb-4 text-sm text-gray-400">Configure header and footer details used in downloadable reports.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={settingsForm.lab_name}
            onChange={(event) => setSettingsForm((current) => ({ ...current, lab_name: event.target.value }))}
            placeholder="Lab name"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            value={settingsForm.email}
            onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Report contact email"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            value={settingsForm.phone}
            onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Report contact phone"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            value={settingsForm.accreditation}
            onChange={(event) => setSettingsForm((current) => ({ ...current, accreditation: event.target.value }))}
            placeholder="Accreditation / license"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            value={settingsForm.address}
            onChange={(event) => setSettingsForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Lab address"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={settingsForm.report_footer}
            onChange={(event) => setSettingsForm((current) => ({ ...current, report_footer: event.target.value }))}
            placeholder="Report footer/disclaimer"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={settingsSaving}
          className="mt-4 rounded-lg border border-indigo-700 px-4 py-2 text-sm text-indigo-300 transition hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {settingsSaving ? "Saving..." : "Save Settings"}
        </button>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 lg:col-span-2">
        <h2 className="text-lg font-medium">Create User</h2>
        <p className="mb-4 text-sm text-gray-400">Provision internal staff by invite link or direct password setup.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <select
            {...register("provisioning")}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          >
            <option value="invite">Send Invite Link (recommended)</option>
            <option value="password">Create with Password</option>
          </select>
          <input
            {...register("full_name")}
            placeholder="Full name"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          <input
            {...register("email")}
            placeholder="Email"
            type="email"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />
          {provisioningMode === "password" ? (
            <input
              {...register("password")}
              placeholder="Temporary password"
              type="password"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
            />
          ) : null}
          <select
            {...register("role")}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="receptionist">Receptionist</option>
            <option value="technician">Technician</option>
          </select>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 lg:col-span-3">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-medium">Users</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((item) => (
                <tr key={item.id} className="border-t border-gray-800 text-gray-200">
                  <td className="px-4 py-3">{item.full_name}</td>
                  <td className="px-4 py-3 text-gray-400">{item.email || "-"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.role}
                      onChange={(event) => void updateUserRole(item.id, event.target.value as Role)}
                      disabled={busyUserId === item.id}
                      className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs capitalize"
                    >
                      <option value="admin">Admin</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="technician">Technician</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs ${
                        item.is_disabled
                          ? "bg-red-600/20 text-red-300"
                          : "bg-emerald-600/20 text-emerald-300"
                      }`}
                    >
                      {item.is_disabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void sendResetLink(item.id)}
                        disabled={busyUserId === item.id}
                        className="rounded-md border border-gray-700 px-2 py-1 text-xs transition hover:border-indigo-400 disabled:opacity-60"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => void toggleUserStatus(item.id, !item.is_disabled)}
                        disabled={busyUserId === item.id}
                        className="rounded-md border border-gray-700 px-2 py-1 text-xs transition hover:border-indigo-400 disabled:opacity-60"
                      >
                        {item.is_disabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        onClick={() => void deleteUser(item.id)}
                        disabled={busyUserId === item.id}
                        className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-300 transition hover:border-red-600 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      </div>
    </div>
  );
}
