import { NextResponse } from "next/server";
import {
  getRequestIp,
  isOnboardingRateLimited,
  isReasonableOnboardingStart,
  isSameOriginRequest,
  recordOnboardingAttempt,
} from "@/src/lib/onboarding-security";
import { seedStarterTestsForOrg } from "@/src/lib/seed-starter-tests";
import { supabaseServerAdmin, supabaseServerAnon } from "@/src/lib/supabase-server";
import { parseJsonBody, publicOnboardingRequestSchema } from "@/src/lib/validation";

export async function POST(request: Request) {
  const clientIp = getRequestIp(request);
  const requestOrigin = request.headers.get("origin");
  const body = await parseJsonBody(request);
  const parsed = publicOnboardingRequestSchema.safeParse(body);

  if (!parsed.success) {
    const unsafeEmail =
      body && typeof body === "object" && "adminEmail" in body && typeof body.adminEmail === "string"
        ? body.adminEmail
        : null;
    await recordOnboardingAttempt({
      email: unsafeEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "invalid_payload",
      reason: "schema_validation_failed",
    });
    return NextResponse.json({ error: "Invalid onboarding data." }, { status: 400 });
  }

  const { labName, adminFullName, adminEmail, adminPassword, phone, website, startedAt } = parsed.data;

  if (!isSameOriginRequest(request)) {
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "blocked",
      reason: "origin_mismatch",
    });
    return NextResponse.json({ error: "Invalid onboarding request origin." }, { status: 403 });
  }

  if (website || !isReasonableOnboardingStart(startedAt)) {
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "blocked",
      reason: website ? "honeypot_triggered" : "suspicious_submission_timing",
    });
    return NextResponse.json({ error: "Unable to process onboarding request." }, { status: 400 });
  }

  const rateLimit = await isOnboardingRateLimited({
    email: adminEmail,
    ip: clientIp,
  });
  if (rateLimit.limited) {
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "rate_limited",
      reason: "too_many_attempts",
    });
    return NextResponse.json(
      { error: "Too many onboarding attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  const { data: signUpData, error: signUpError } = await supabaseServerAnon.auth.signUp({
    email: adminEmail,
    password: adminPassword,
    options: {
      data: { full_name: adminFullName },
    },
  });

  if (signUpError || !signUpData.user) {
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "signup_failed",
      reason: signUpError?.message ?? "signup_failed",
    });
    return NextResponse.json({ error: "Unable to set up your lab." }, { status: 400 });
  }

  const isExistingUserAttempt = Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0;
  if (isExistingUserAttempt) {
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "blocked",
      reason: "email_already_registered",
    });
    return NextResponse.json(
      { error: "This email is already registered or awaiting confirmation." },
      { status: 409 }
    );
  }

  const userId = signUpData.user.id;

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
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "provisioning_failed",
      reason: orgError?.message ?? "organization_creation_failed",
    });
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
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "provisioning_failed",
      reason: profileError.message,
    });
    return NextResponse.json({ error: profileError.message }, { status: 500 });
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
    await recordOnboardingAttempt({
      email: adminEmail,
      ip: clientIp,
      origin: requestOrigin,
      outcome: "provisioning_failed",
      reason: settingsError.message,
    });
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: orgId,
    user_id: userId,
    action: "onboarding_completed",
    table_name: "profiles",
    record_id: userId,
  });

  await seedStarterTestsForOrg(orgId, userId);

  await recordOnboardingAttempt({
    email: adminEmail,
    ip: clientIp,
    origin: requestOrigin,
    outcome: "success",
    reason: "confirmation_pending",
  });

  return NextResponse.json({
    success: true,
    message: "Lab setup started. Check your email to confirm your account before signing in.",
  });
}
