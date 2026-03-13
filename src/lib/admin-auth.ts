import { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerAnon } from "@/src/lib/supabase-server";

export const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "").trim();
};

export const assertAdminFromRequest = async (request: NextRequest) => {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return authResult;
  }

  if (authResult.role !== "admin") {
    return { ok: false as const, status: 403, message: "Admin access required." };
  }

  return { ok: true as const, userId: authResult.userId, orgId: authResult.orgId };
};

export const assertAuthenticatedFromRequest = async (request: NextRequest) => {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false as const, status: 401, message: "Missing access token." };
  }

  const { data: userData, error: userError } = await supabaseServerAnon.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false as const, status: 401, message: "Invalid access token." };
  }

  const { data: profile, error: profileError } = await supabaseServerAdmin
    .from("profiles")
    .select("role,org_id")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile?.role || !profile?.org_id) {
    return { ok: false as const, status: 403, message: "Authenticated profile required." };
  }

  return {
    ok: true as const,
    userId: userData.user.id,
    orgId: profile.org_id,
    role: profile.role,
  };
};
