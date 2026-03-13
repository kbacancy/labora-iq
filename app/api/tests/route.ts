import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { labTestSchema, parseJsonBody } from "@/src/lib/validation";

export async function POST(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = labTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data, error } = await supabaseServerAdmin
    .from("tests")
    .insert({
      org_id: authResult.orgId,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "test_created",
    table_name: "tests",
    record_id: data.id,
  });

  return NextResponse.json({ data, message: "Test created." }, { status: 201 });
}
