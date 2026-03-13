import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { createNotificationSchema, parseJsonBody, updateNotificationReadSchema } from "@/src/lib/validation";

export async function POST(request: NextRequest) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { error } = await supabaseServerAdmin.from("notifications").insert({
    org_id: authResult.orgId,
    recipient_user_id: parsed.data.recipientUserId ?? null,
    recipient_role: parsed.data.recipientRole ?? null,
    type: parsed.data.type,
    title: parsed.data.title,
    message: parsed.data.message,
    entity_type: parsed.data.entityType ?? null,
    entity_id: parsed.data.entityId ?? null,
    action_url: parsed.data.actionUrl ?? null,
    created_by: authResult.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = updateNotificationReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  if (parsed.data.action === "mark_read") {
    const { data: notification, error: notificationError } = await supabaseServerAdmin
      .from("notifications")
      .select("id,org_id,recipient_user_id,recipient_role,is_read")
      .eq("id", parsed.data.notificationId)
      .single();

    if (notificationError || !notification || notification.org_id !== authResult.orgId) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    const isRecipient =
      notification.recipient_user_id === authResult.userId ||
      (notification.recipient_role != null && notification.recipient_role === authResult.role);

    if (!isRecipient) {
      return NextResponse.json({ error: "You cannot update this notification." }, { status: 403 });
    }

    if (!notification.is_read) {
      const { error } = await supabaseServerAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("org_id", authResult.orgId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: "Notification marked as read." });
  }

  const { error } = await supabaseServerAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("org_id", authResult.orgId)
    .eq("is_read", false)
    .or(`recipient_user_id.eq.${authResult.userId},recipient_role.eq.${authResult.role}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Notifications marked as read." });
}
