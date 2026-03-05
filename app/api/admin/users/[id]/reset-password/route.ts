import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin, supabaseServerAnon } from "@/src/lib/supabase-server";

export async function POST(
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

  const { data: userData, error: userError } = await supabaseServerAdmin.auth.admin.getUserById(id);
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
