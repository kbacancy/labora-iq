"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useAuth } from "@/src/context/AuthContext";
import type { Role } from "@/src/types/database";
import { formatDate } from "@/src/lib/format";
import { supabase } from "@/src/lib/supabase";
import { createUserSchema, labSettingsSchema } from "@/src/lib/validation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { PaginationControls } from "@/src/components/ui/PaginationControls";
import {
  StatusBadge,
  SurfaceSection,
  compactButtonClassName,
  compactDangerButtonClassName,
  errorTextClassName,
  fieldLabelClassName,
  inputClassName,
  primaryButtonClassName,
  selectClassName,
  successTextClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableMutedCellClassName,
  tableRowClassName,
  tableWrapperClassName,
} from "@/src/components/ui/surface";

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

type UserFormValues = {
  provisioning: "invite" | "password";
  email: string;
  password?: string;
  full_name: string;
  role: Role;
};

export default function AdminPage() {
  const DEFAULT_PAGE_SIZE = 10;
  const { role } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalUsers, setTotalUsers] = useState(0);
  const [settingsForm, setSettingsForm] = useState({
    lab_name: "",
    address: "",
    phone: "",
    email: "",
    accreditation: "",
    report_footer: "",
  });

  const { control, register, handleSubmit, reset } = useForm<UserFormValues>({
    defaultValues: { provisioning: "invite", email: "", password: "", full_name: "", role: "receptionist" },
  });
  const provisioningMode = useWatch({ control, name: "provisioning" });

  const getAccessToken = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }, []);

  const loadUsers = useCallback(async () => {
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
      setTotalUsers(0);
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/admin/users?page=${page}&pageSize=${pageSize}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load users.");
      setUsers([]);
      setTotalUsers(0);
      setLoading(false);
      return;
    }

    setUsers(payload.data ?? []);
    setTotalUsers(payload.total ?? 0);
    setLoading(false);
  }, [page, pageSize, role]);

  const loadSettings = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setError("No active session token.");
      return;
    }

    const response = await fetch("/api/admin/settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      data?: LabSettings | null;
    };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load lab settings.");
      return;
    }

    const data = payload.data ?? null;
    if (!data) {
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

    setSettingsForm({
      lab_name: data.lab_name ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      accreditation: data.accreditation ?? "",
      report_footer: data.report_footer ?? "",
    });
  }, [getAccessToken]);

  const loadOrganization = useCallback(async () => {
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
  }, [getAccessToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
      void loadSettings();
      void loadOrganization();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrganization, loadSettings, loadUsers]);

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
    const parsed = labSettingsSchema.safeParse(settingsForm);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid lab settings.");
      return;
    }

    setSettingsSaving(true);
    setError(null);
    setSuccess(null);

    const token = await getAccessToken();
    if (!token) {
      setSettingsSaving(false);
      setError("No active session token.");
      return;
    }

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setSettingsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to update lab settings.");
      return;
    }

    setSuccess(payload.message ?? "Lab settings updated.");
    await loadSettings();
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = createUserSchema.safeParse(values);
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
    if (page !== 1) {
      setPage(1);
      return;
    }
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
    if (users.length === 1 && page > 1) {
      setPage((current) => current - 1);
      return;
    }
    await loadUsers();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Admin Console" description="Control tenant identity, report settings, and workspace user provisioning from one governance surface." eyebrow="Administrative control" />

      {error ? <p className={errorTextClassName}>{error}</p> : null}
      {success ? <p className={successTextClassName}>{success}</p> : null}

      <SurfaceSection eyebrow="Tenant identity" title="Organization profile" description="Manage the tenant identity that anchors this laboratory workspace.">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Organization name"
            className={`${inputClassName} md:col-span-2`}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 px-4 py-3 text-xs text-slate-400">
            Created: {organization?.created_at ? formatDate(organization.created_at) : "-"}
          </div>
        </div>
        <button type="button" onClick={() => void saveOrganization()} disabled={organizationSaving} className={`mt-4 ${primaryButtonClassName}`}>
          {organizationSaving ? "Saving..." : "Save Organization"}
        </button>
      </SurfaceSection>

      <SurfaceSection eyebrow="Report identity" title="Lab report settings" description="Configure the metadata used in generated reports and release documents.">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={settingsForm.lab_name}
            onChange={(event) => setSettingsForm((current) => ({ ...current, lab_name: event.target.value }))}
            placeholder="Lab name"
            className={inputClassName}
          />
          <input
            value={settingsForm.email}
            onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Report contact email"
            className={inputClassName}
          />
          <input
            value={settingsForm.phone}
            onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Report contact phone"
            className={inputClassName}
          />
          <input
            value={settingsForm.accreditation}
            onChange={(event) => setSettingsForm((current) => ({ ...current, accreditation: event.target.value }))}
            placeholder="Accreditation / license"
            className={inputClassName}
          />
          <input
            value={settingsForm.address}
            onChange={(event) => setSettingsForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Lab address"
            className={`${inputClassName} md:col-span-2`}
          />
          <input
            value={settingsForm.report_footer}
            onChange={(event) => setSettingsForm((current) => ({ ...current, report_footer: event.target.value }))}
            placeholder="Report footer/disclaimer"
            className={`${inputClassName} md:col-span-2`}
          />
        </div>
        <button type="button" onClick={() => void saveSettings()} disabled={settingsSaving} className={`mt-4 ${primaryButtonClassName}`}>
          {settingsSaving ? "Saving..." : "Save Settings"}
        </button>
      </SurfaceSection>

      <div className="grid gap-5 lg:grid-cols-5">
        <SurfaceSection eyebrow="Provisioning" title="Create user" description="Provision internal staff by invite link or direct password setup." className="lg:col-span-2">
          <form onSubmit={onSubmit} className="space-y-3">
            <label>
              <span className={fieldLabelClassName}>Provisioning mode</span>
              <select {...register("provisioning")} className={selectClassName}>
                <option value="invite">Send Invite Link (recommended)</option>
                <option value="password">Create with Password</option>
              </select>
            </label>
            <label>
              <span className={fieldLabelClassName}>Full name</span>
              <input {...register("full_name")} placeholder="Full name" className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Email</span>
              <input {...register("email")} placeholder="Email" type="email" className={inputClassName} />
            </label>
            {provisioningMode === "password" ? (
              <label>
                <span className={fieldLabelClassName}>Temporary password</span>
                <input {...register("password")} placeholder="Temporary password" type="password" className={inputClassName} />
              </label>
            ) : null}
            <label>
              <span className={fieldLabelClassName}>Role</span>
              <select {...register("role")} className={selectClassName}>
                <option value="admin">Admin</option>
                <option value="receptionist">Receptionist</option>
                <option value="technician">Technician</option>
              </select>
            </label>
            <button type="submit" disabled={submitting} className={primaryButtonClassName}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </SurfaceSection>

        <section className={`${tableWrapperClassName} lg:col-span-3`}>
          <table className="min-w-full text-sm">
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Name</th>
                <th className={tableHeaderCellClassName}>Email</th>
                <th className={tableHeaderCellClassName}>Role</th>
                <th className={tableHeaderCellClassName}>Status</th>
                <th className={tableHeaderCellClassName}>Created</th>
                <th className={tableHeaderCellClassName}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id} className={tableRowClassName}>
                    <td className={tableCellClassName}>{item.full_name}</td>
                    <td className={tableMutedCellClassName}>{item.email || "-"}</td>
                    <td className={tableCellClassName}>
                      <select
                        value={item.role}
                        onChange={(event) => void updateUserRole(item.id, event.target.value as Role)}
                        disabled={busyUserId === item.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-xs capitalize text-slate-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="technician">Technician</option>
                      </select>
                    </td>
                    <td className={tableCellClassName}>
                      <StatusBadge tone={item.is_disabled ? "danger" : "good"}>
                        {item.is_disabled ? "Disabled" : "Active"}
                      </StatusBadge>
                    </td>
                    <td className={tableMutedCellClassName}>{formatDate(item.created_at)}</td>
                    <td className={tableCellClassName}>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void sendResetLink(item.id)} disabled={busyUserId === item.id} className={compactButtonClassName}>
                          Reset
                        </button>
                        <button type="button" onClick={() => void toggleUserStatus(item.id, !item.is_disabled)} disabled={busyUserId === item.id} className={compactButtonClassName}>
                          {item.is_disabled ? "Enable" : "Disable"}
                        </button>
                        <button type="button" onClick={() => void deleteUser(item.id)} disabled={busyUserId === item.id} className={compactDangerButtonClassName}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
          </table>
          {!loading && totalUsers > 0 ? (
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={totalUsers}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
