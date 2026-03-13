import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { parseJsonBody, patientSchema } from "@/src/lib/validation";

export async function POST(request: NextRequest) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  if (!["admin", "receptionist"].includes(authResult.role)) {
    return NextResponse.json({ error: "You cannot create patients." }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data, error } = await supabaseServerAdmin
    .from("patients")
    .insert({
      org_id: authResult.orgId,
      ...parsed.data,
      created_by: authResult.userId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "patient_created",
    table_name: "patients",
    record_id: data.id,
  });

  return NextResponse.json({ data, message: "Patient created." }, { status: 201 });
}
