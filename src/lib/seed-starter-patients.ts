import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { STARTER_PATIENT_REGISTRY } from "@/src/lib/starter-patients";

export const seedStarterPatientsForOrg = async (orgId: string, actorUserId?: string | null) => {
  const existingQuery = await supabaseServerAdmin
    .from("patients")
    .select("name,phone")
    .eq("org_id", orgId);

  if (existingQuery.error) {
    return { ok: false as const, error: existingQuery.error.message, count: 0 };
  }

  const existingKeys = new Set(
    (existingQuery.data ?? []).map((row) => `${row.name.toLowerCase()}::${row.phone}`)
  );

  const toInsert = STARTER_PATIENT_REGISTRY.filter(
    (patient) => !existingKeys.has(`${patient.name.toLowerCase()}::${patient.phone}`)
  ).map((patient) => ({
    org_id: orgId,
    created_by: actorUserId ?? null,
    ...patient,
  }));

  if (toInsert.length > 0) {
    const insertResult = await supabaseServerAdmin.from("patients").insert(toInsert);
    if (insertResult.error) {
      return { ok: false as const, error: insertResult.error.message, count: 0 };
    }
  }

  if (actorUserId) {
    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: orgId,
      user_id: actorUserId,
      action: "starter_patient_registry_seeded",
      table_name: "patients",
      record_id: null,
    });
  }

  return { ok: true as const, count: toInsert.length, total: STARTER_PATIENT_REGISTRY.length };
};
