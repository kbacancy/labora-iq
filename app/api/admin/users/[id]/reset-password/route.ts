import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin, supabaseServerAnon } from "@/src/lib/supabase-server";
import { userIdParamSchema } from "@/src/lib/validation";

export async function POST(
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
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "User id is required." }, { status: 400 });
  }

  const { data: targetProfile, error: targetProfileError } = await supabaseServerAdmin
    .from("profiles")
    .select("id,org_id")
    .eq("id", validatedId.data)
    .single();

  if (targetProfileError || !targetProfile || targetProfile.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
  }

  const { data: userData, error: userError } = await supabaseServerAdmin.auth.admin.getUserById(validatedId.data);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: userError?.message ?? "User email not found." }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const { error } = await supabaseServerAnon.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${origin}/login`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Password reset email sent." });
}
