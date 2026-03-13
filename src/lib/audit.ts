import { supabase } from "@/src/lib/supabase";

interface AuditLogInput {
  userId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
}

export const createAuditLog = async (input: AuditLogInput) => {
  const { action, tableName, recordId } = input;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    console.error("Audit log insert failed:", "Missing access token.");
    return;
  }

  const response = await fetch("/api/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action,
      tableName,
      recordId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    // Avoid blocking user workflows because of audit log issues.
    console.error("Audit log insert failed:", payload.error ?? "Request failed.");
  }
};
