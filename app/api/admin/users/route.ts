import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { createUserSchema, parseJsonBody } from "@/src/lib/validation";

export async function GET(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSizeParam = Number(request.nextUrl.searchParams.get("pageSize") ?? "10");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(Math.floor(pageSizeParam), 100) : 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: profiles, error: profilesError, count } = await supabaseServerAdmin
    .from("profiles")
    .select("id,full_name,role,created_at", { count: "exact" })
    .eq("org_id", authResult.orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const { data: usersData, error: usersError } = await supabaseServerAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const usersById = new Map(
    (usersData?.users ?? []).map((user) => [
      user.id,
      { email: user.email ?? "", banned_until: user.banned_until },
    ])
  );

  const data = (profiles ?? []).map((profile) => {
    const authUser = usersById.get(profile.id);
    const isDisabled = Boolean(
      authUser?.banned_until && new Date(authUser.banned_until).getTime() > Date.now()
    );
    return {
      ...profile,
      email: authUser?.email ?? "",
      is_disabled: isDisabled,
    };
  });

  return NextResponse.json({ data, page, pageSize, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { email, full_name, role, provisioning } = parsed.data;
  const created =
    provisioning === "invite"
      ? await supabaseServerAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name },
          redirectTo: `${request.nextUrl.origin}/login`,
        })
      : await supabaseServerAdmin.auth.admin.createUser({
          email,
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: { full_name },
        });

  const { data: createdUser, error: createError } = created;

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Unable to create user." }, { status: 500 });
  }

  const { error: profileError } = await supabaseServerAdmin.from("profiles").insert({
    id: createdUser.user.id,
    full_name,
    role,
    org_id: authResult.orgId,
  });

  if (profileError) {
    await supabaseServerAdmin.auth.admin.deleteUser(createdUser.user.id, true);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: memberError } = await supabaseServerAdmin.from("organization_members").upsert(
    {
      org_id: authResult.orgId,
      user_id: createdUser.user.id,
      role,
      full_name,
    },
    { onConflict: "org_id,user_id" }
  );

  if (memberError) {
    await supabaseServerAdmin.from("profiles").delete().eq("id", createdUser.user.id);
    await supabaseServerAdmin.auth.admin.deleteUser(createdUser.user.id, true);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: provisioning === "invite" ? "Invitation sent successfully." : "User created successfully." },
    { status: 201 }
  );
}
