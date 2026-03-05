import { supabase } from "@/src/lib/supabase";
import type { Role } from "@/src/types/database";

interface CreateNotificationInput {
  recipientUserId?: string | null;
  recipientRole?: Role | null;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  createdBy?: string | null;
}

export const createNotification = async ({
  recipientUserId,
  recipientRole,
  type,
  title,
  message,
  entityType,
  entityId,
  createdBy,
}: CreateNotificationInput) => {
  if (!recipientUserId && !recipientRole) {
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: recipientUserId ?? null,
    recipient_role: recipientRole ?? null,
    type,
    title,
    message,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    created_by: createdBy ?? null,
  });

  if (error) {
    console.error("Notification insert failed:", error.message);
  }
};
