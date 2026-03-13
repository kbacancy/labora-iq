import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { compliancePolicySchema, parseJsonBody } from "@/src/lib/validation";

export async function GET(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { data, error } = await supabaseServerAdmin
    .from("compliance_policies")
    .select("*")
    .eq("org_id", authResult.orgId)
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function PUT(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = compliancePolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const payload = {
    org_id: authResult.orgId,
    singleton: true,
    audit_log_retention_days: parsed.data.audit_log_retention_days,
    report_retention_days: parsed.data.report_retention_days,
    access_review_frequency_days: parsed.data.access_review_frequency_days,
    updated_by: authResult.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerAdmin
    .from("compliance_policies")
    .upsert(payload, { onConflict: "org_id,singleton" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, message: "Compliance policy updated." });
}
