import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_role"),
    role: z.enum(["admin", "receptionist", "technician"]),
  }),
  z.object({
    action: z.literal("set_disabled"),
    disabled: z.boolean(),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const { data: targetProfile, error: targetProfileError } = await supabaseServerAdmin
    .from("profiles")
    .select("id,org_id")
    .eq("id", id)
    .single();

  if (targetProfileError || !targetProfile || targetProfile.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  if (parsed.data.action === "update_role") {
    const { error } = await supabaseServerAdmin
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", id)
      .eq("org_id", authResult.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: memberError } = await supabaseServerAdmin
      .from("organization_members")
      .update({ role: parsed.data.role })
      .eq("user_id", id)
      .eq("org_id", authResult.orgId);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Role updated." });
  }

  const { error } = await supabaseServerAdmin.auth.admin.updateUserById(id, {
    ban_duration: parsed.data.disabled ? "876000h" : "none",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: parsed.data.disabled ? "User disabled." : "User enabled." });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  if (authResult.userId === id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const { data: targetProfile, error: targetProfileError } = await supabaseServerAdmin
    .from("profiles")
    .select("id,org_id")
    .eq("id", id)
    .single();

  if (targetProfileError || !targetProfile || targetProfile.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
  }

  const { error } = await supabaseServerAdmin.auth.admin.deleteUser(id, true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "User deleted." });
}
