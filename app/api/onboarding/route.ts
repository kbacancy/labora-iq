import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";

const onboardingSchema = z.object({
  labName: z.string().trim().min(2),
  adminFullName: z.string().trim().min(2),
  adminEmail: z.email(),
  adminPassword: z.string().min(8),
  phone: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding data." }, { status: 400 });
  }

  const { labName, adminFullName, adminEmail, adminPassword, phone } = parsed.data;

  const { data: createdUser, error: createUserError } = await supabaseServerAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminFullName },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json({ error: createUserError?.message ?? "Unable to create admin user." }, { status: 400 });
  }

  const userId = createdUser.user.id;

  const { data: orgData, error: orgError } = await supabaseServerAdmin
    .from("organizations")
    .insert({
      name: labName,
      created_by: userId,
    })
    .select("id")
    .single();

  if (orgError || !orgData?.id) {
    await supabaseServerAdmin.auth.admin.deleteUser(userId, true);
    return NextResponse.json({ error: orgError?.message ?? "Unable to create organization." }, { status: 500 });
  }

  const orgId = orgData.id;

  const { error: profileError } = await supabaseServerAdmin.from("profiles").insert({
    id: userId,
    full_name: adminFullName,
    role: "admin",
    org_id: orgId,
  });

  if (profileError) {
    await supabaseServerAdmin.from("organizations").delete().eq("id", orgId);
    await supabaseServerAdmin.auth.admin.deleteUser(userId, true);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: memberError } = await supabaseServerAdmin.from("organization_members").insert({
    org_id: orgId,
    user_id: userId,
    role: "admin",
    full_name: adminFullName,
  });

  if (memberError) {
    await supabaseServerAdmin.from("profiles").delete().eq("id", userId);
    await supabaseServerAdmin.from("organizations").delete().eq("id", orgId);
    await supabaseServerAdmin.auth.admin.deleteUser(userId, true);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: settingsError } = await supabaseServerAdmin.from("lab_settings").upsert(
    {
      org_id: orgId,
      singleton: true,
      lab_name: labName,
      phone: phone || null,
      email: adminEmail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,singleton" }
  );

  if (settingsError) {
    await supabaseServerAdmin.from("organization_members").delete().eq("org_id", orgId).eq("user_id", userId);
    await supabaseServerAdmin.from("profiles").delete().eq("id", userId);
    await supabaseServerAdmin.from("organizations").delete().eq("id", orgId);
    await supabaseServerAdmin.auth.admin.deleteUser(userId, true);
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: orgId,
    user_id: userId,
    action: "onboarding_completed",
    table_name: "profiles",
    record_id: userId,
  });

  return NextResponse.json({ success: true });
}
