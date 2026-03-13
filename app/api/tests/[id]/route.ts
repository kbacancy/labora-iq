import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { userIdParamSchema } from "@/src/lib/validation";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await params;
  const validatedId = userIdParamSchema.safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "Test id is required." }, { status: 400 });
  }

  const { error } = await supabaseServerAdmin
    .from("tests")
    .delete()
    .eq("id", validatedId.data)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "test_deleted",
    table_name: "tests",
    record_id: validatedId.data,
  });

  return NextResponse.json({ message: "Test deleted." });
}
