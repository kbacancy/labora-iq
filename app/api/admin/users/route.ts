import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  role: z.enum(["admin", "receptionist", "technician"]),
});

export async function GET(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { data: profiles, error: profilesError } = await supabaseServerAdmin
    .from("profiles")
    .select("id,full_name,role,created_at")
    .order("created_at", { ascending: false });

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

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { email, password, full_name, role } = parsed.data;

  const { data: createdUser, error: createError } = await supabaseServerAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !createdUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Unable to create user." }, { status: 500 });
  }

  const { error: profileError } = await supabaseServerAdmin.from("profiles").insert({
    id: createdUser.user.id,
    full_name,
    role,
  });

  if (profileError) {
    await supabaseServerAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "User created successfully." }, { status: 201 });
}
