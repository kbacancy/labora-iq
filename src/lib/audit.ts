import { supabase } from "@/src/lib/supabase";

interface AuditLogInput {
  userId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
}

export const createAuditLog = async ({ userId, action, tableName, recordId }: AuditLogInput) => {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId ?? null,
    action,
    table_name: tableName,
    record_id: recordId ?? null,
  });

  if (error) {
    // Avoid blocking user workflows because of audit log issues.
    console.error("Audit log insert failed:", error.message);
  }
};
