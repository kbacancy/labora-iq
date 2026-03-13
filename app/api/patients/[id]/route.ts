import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { parseJsonBody, updatePatientActionSchema, userIdParamSchema } from "@/src/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  if (!["admin", "receptionist"].includes(authResult.role)) {
    return NextResponse.json({ error: "You cannot update patients." }, { status: 403 });
  }

  const { id } = await params;
  const validatedId = userIdParamSchema.safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "Patient id is required." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await supabaseServerAdmin
    .from("patients")
    .select("id,org_id")
    .eq("id", validatedId.data)
    .single();

  if (patientError || !patient || patient.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Patient not found in your organization." }, { status: 404 });
  }

  const body = await parseJsonBody(request);
  const parsed = updatePatientActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  if (parsed.data.action === "update_details") {
    const { error } = await supabaseServerAdmin
      .from("patients")
      .update(parsed.data.data)
      .eq("id", patient.id)
      .eq("org_id", authResult.orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: authResult.orgId,
      user_id: authResult.userId,
      action: "patient_updated",
      table_name: "patients",
      record_id: patient.id,
    });

    return NextResponse.json({ message: "Patient updated." });
  }

  const payload = parsed.data.archived
    ? {
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: authResult.userId,
      }
    : {
        is_archived: false,
        archived_at: null,
        archived_by: null,
      };

  const { error } = await supabaseServerAdmin
    .from("patients")
    .update(payload)
    .eq("id", patient.id)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: parsed.data.archived ? "patient_archived" : "patient_restored",
    table_name: "patients",
    record_id: patient.id,
  });

  return NextResponse.json({
    message: parsed.data.archived ? "Patient archived successfully." : "Patient restored successfully.",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  if (authResult.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const validatedId = userIdParamSchema.safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "Patient id is required." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await supabaseServerAdmin
    .from("patients")
    .select("id,org_id")
    .eq("id", validatedId.data)
    .single();

  if (patientError || !patient || patient.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Patient not found in your organization." }, { status: 404 });
  }

  const { count: linkedOrderCount, error: linkedOrderError } = await supabaseServerAdmin
    .from("lab_orders")
    .select("*", { count: "exact", head: true })
    .eq("org_id", authResult.orgId)
    .eq("patient_id", patient.id);

  if (linkedOrderError) {
    return NextResponse.json({ error: linkedOrderError.message }, { status: 500 });
  }

  if ((linkedOrderCount ?? 0) > 0) {
    return NextResponse.json({ error: "Cannot delete patient with existing orders. Archive instead." }, { status: 400 });
  }

  const { error } = await supabaseServerAdmin
    .from("patients")
    .delete()
    .eq("id", patient.id)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "patient_deleted",
    table_name: "patients",
    record_id: patient.id,
  });

  return NextResponse.json({ message: "Patient deleted successfully." });
}
