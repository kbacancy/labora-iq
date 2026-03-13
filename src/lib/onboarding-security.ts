import { createHash } from "crypto";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";

type OnboardingAttemptOutcome =
  | "success"
  | "invalid_payload"
  | "blocked"
  | "rate_limited"
  | "signup_failed"
  | "provisioning_failed";

const IP_WINDOW_MINUTES = 15;
const EMAIL_WINDOW_MINUTES = 60;
const MAX_IP_ATTEMPTS = 5;
const MAX_EMAIL_ATTEMPTS = 3;
const MIN_FORM_FILL_MS = 1500;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 24;

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

export const getRequestIp = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
};

export const isSameOriginRequest = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export const isReasonableOnboardingStart = (startedAt: string) => {
  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return false;
  }

  const elapsedMs = Date.now() - startedAtMs;
  return elapsedMs >= MIN_FORM_FILL_MS && elapsedMs <= MAX_FORM_AGE_MS;
};

export const recordOnboardingAttempt = async ({
  email,
  ip,
  outcome,
  reason,
  origin,
}: {
  email?: string | null;
  ip?: string | null;
  outcome: OnboardingAttemptOutcome;
  reason?: string | null;
  origin?: string | null;
}) => {
  const payload = {
    email_hash: email ? hashValue(email.trim().toLowerCase()) : null,
    ip_hash: ip ? hashValue(ip) : null,
    outcome,
    reason: reason ?? null,
    origin: origin ?? null,
  };

  await supabaseServerAdmin.from("onboarding_attempts").insert(payload);
};

export const isOnboardingRateLimited = async ({
  email,
  ip,
}: {
  email: string;
  ip?: string | null;
}) => {
  const emailHash = hashValue(email.trim().toLowerCase());
  const emailSince = new Date(Date.now() - EMAIL_WINDOW_MINUTES * 60 * 1000).toISOString();

  const emailPromise = supabaseServerAdmin
    .from("onboarding_attempts")
    .select("*", { count: "exact", head: true })
    .eq("email_hash", emailHash)
    .gte("created_at", emailSince);

  const ipPromise = ip
    ? supabaseServerAdmin
        .from("onboarding_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", hashValue(ip))
        .gte("created_at", new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000).toISOString())
    : Promise.resolve({ count: 0, error: null });

  const [emailResult, ipResult] = await Promise.all([emailPromise, ipPromise]);

  const emailCount = emailResult.count ?? 0;
  const ipCount = ipResult.count ?? 0;

  return {
    limited: emailCount >= MAX_EMAIL_ATTEMPTS || ipCount >= MAX_IP_ATTEMPTS,
    emailCount,
    ipCount,
  };
};
