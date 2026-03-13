import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { parseJsonBody, updateSampleWorkflowSchema, userIdParamSchema } from "@/src/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await params;
  const validatedId = userIdParamSchema.safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "Sample id is required." }, { status: 400 });
  }

  const body = await parseJsonBody(request);
  const parsed = updateSampleWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data: sample, error: sampleError } = await supabaseServerAdmin
    .from("samples")
    .select("id,org_id,sample_code,status,technician_id")
    .eq("id", validatedId.data)
    .single();

  if (sampleError || !sample || sample.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Sample not found in your organization." }, { status: 404 });
  }

  if (parsed.data.action === "set_status") {
    if (!["admin", "technician"].includes(authResult.role)) {
      return NextResponse.json({ error: "You cannot update sample status." }, { status: 403 });
    }

    if (authResult.role === "technician" && sample.technician_id !== authResult.userId) {
      return NextResponse.json({ error: "You can only update samples assigned to you." }, { status: 403 });
    }

    const { error } = await supabaseServerAdmin
      .from("samples")
      .update({ status: parsed.data.status })
      .eq("id", sample.id)
      .eq("org_id", authResult.orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: authResult.orgId,
      user_id: authResult.userId,
      action: "sample_status_updated",
      table_name: "samples",
      record_id: sample.id,
    });
    await supabaseServerAdmin.from("notifications").insert([
      {
        org_id: authResult.orgId,
        recipient_user_id: null,
        recipient_role: "admin",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sample.sample_code} moved to ${parsed.data.status}.`,
        entity_type: "samples",
        entity_id: sample.id,
        action_url: `/dashboard/samples/${sample.id}`,
        created_by: authResult.userId,
      },
      {
        org_id: authResult.orgId,
        recipient_user_id: null,
        recipient_role: "receptionist",
        type: "sample_status",
        title: "Sample Status Updated",
        message: `Sample ${sample.sample_code} moved to ${parsed.data.status}.`,
        entity_type: "samples",
        entity_id: sample.id,
        action_url: `/dashboard/samples/${sample.id}`,
        created_by: authResult.userId,
      },
    ]);

    return NextResponse.json({ message: "Sample status updated." });
  }

  if (!["admin", "receptionist"].includes(authResult.role)) {
    return NextResponse.json({ error: "You cannot change sample assignment." }, { status: 403 });
  }

  if (parsed.data.technician_id) {
    const { data: technician, error: technicianError } = await supabaseServerAdmin
      .from("profiles")
      .select("id,role,org_id")
      .eq("id", parsed.data.technician_id)
      .single();

    if (technicianError || !technician || technician.org_id !== authResult.orgId || technician.role !== "technician") {
      return NextResponse.json({ error: "Technician not found in your organization." }, { status: 404 });
    }
  }

  const { error } = await supabaseServerAdmin
    .from("samples")
    .update({ technician_id: parsed.data.technician_id ?? null })
    .eq("id", sample.id)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "sample_technician_updated",
    table_name: "samples",
    record_id: sample.id,
  });

  if (parsed.data.technician_id) {
    await supabaseServerAdmin.from("notifications").insert({
      org_id: authResult.orgId,
      recipient_user_id: parsed.data.technician_id,
      recipient_role: null,
      type: "sample_assigned",
      title: "Sample Assigned",
      message: `You were assigned sample ${sample.sample_code}.`,
      entity_type: "samples",
      entity_id: sample.id,
      action_url: `/dashboard/samples/${sample.id}`,
      created_by: authResult.userId,
    });
  }

  return NextResponse.json({ message: "Sample assignment updated." });
}
