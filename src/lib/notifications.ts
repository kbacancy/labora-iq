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
  actionUrl?: string | null;
  createdBy?: string | null;
}

export const createNotification = async (input: CreateNotificationInput) => {
  const { recipientUserId, recipientRole, type, title, message, entityType, entityId, actionUrl } = input;
  if (!recipientUserId && !recipientRole) {
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    console.error("Notification insert failed:", "Missing access token.");
    return;
  }

  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipientUserId,
      recipientRole,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    console.error("Notification insert failed:", payload.error ?? "Request failed.");
  }
};
