import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { labSettingsSchema, parseJsonBody } from "@/src/lib/validation";

export async function GET(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { data, error } = await supabaseServerAdmin
    .from("lab_settings")
    .select("id,lab_name,address,phone,email,logo_url,accreditation,report_footer,updated_at")
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
  const parsed = labSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const payload = {
    org_id: authResult.orgId,
    singleton: true,
    lab_name: parsed.data.lab_name,
    address: parsed.data.address ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    accreditation: parsed.data.accreditation ?? null,
    report_footer: parsed.data.report_footer ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerAdmin
    .from("lab_settings")
    .upsert(payload, { onConflict: "org_id,singleton" })
    .select("id,lab_name,address,phone,email,logo_url,accreditation,report_footer,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, message: "Lab settings updated." });
}
