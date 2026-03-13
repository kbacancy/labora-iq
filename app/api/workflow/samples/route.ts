import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { generateSampleCode } from "@/src/lib/samples";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { createSampleSchema, parseJsonBody } from "@/src/lib/validation";

export async function POST(request: NextRequest) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  if (!["admin", "receptionist"].includes(authResult.role)) {
    return NextResponse.json({ error: "You cannot create samples." }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  const parsed = createSampleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await supabaseServerAdmin
    .from("patients")
    .select("id,name,org_id")
    .eq("id", parsed.data.patient_id)
    .single();

  if (patientError || !patient || patient.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Patient not found in your organization." }, { status: 404 });
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

  let insertedId: string | null = null;
  let attempts = 0;

  while (!insertedId && attempts < 5) {
    attempts += 1;
    const sampleCode = generateSampleCode();
    const { data: inserted, error } = await supabaseServerAdmin
      .from("samples")
      .insert({
        org_id: authResult.orgId,
        sample_code: sampleCode,
        patient_id: parsed.data.patient_id,
        patient_name: patient.name,
        test_type: parsed.data.test_type,
        technician_id: parsed.data.technician_id ?? null,
        status: "collected",
        created_by: authResult.userId,
      })
      .select("id")
      .single();

    if (!error && inserted?.id) {
      insertedId = inserted.id;
      break;
    }

    if (error && !error.message.includes("duplicate key")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!insertedId) {
    return NextResponse.json({ error: "Failed to generate unique sample code. Please retry." }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "sample_created",
    table_name: "samples",
    record_id: insertedId,
  });

  const notifications = [];
  if (parsed.data.technician_id) {
    notifications.push({
      org_id: authResult.orgId,
      recipient_user_id: parsed.data.technician_id,
      recipient_role: null,
      type: "sample_assigned",
      title: "New Sample Assigned",
      message: `Sample ${insertedId.slice(0, 8)} has been assigned to you for ${parsed.data.test_type}.`,
      entity_type: "samples",
      entity_id: insertedId,
      action_url: `/dashboard/samples/${insertedId}`,
      created_by: authResult.userId,
    });
  }
  notifications.push({
    org_id: authResult.orgId,
    recipient_user_id: null,
    recipient_role: "admin",
    type: "sample_created",
    title: "Sample Created",
    message: `A new sample has been created for patient ${patient.name}.`,
    entity_type: "samples",
    entity_id: insertedId,
    action_url: `/dashboard/samples/${insertedId}`,
    created_by: authResult.userId,
  });
  await supabaseServerAdmin.from("notifications").insert(notifications);

  return NextResponse.json({ message: "Sample created.", data: { id: insertedId } }, { status: 201 });
}
