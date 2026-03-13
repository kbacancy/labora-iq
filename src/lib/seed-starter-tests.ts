import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { STARTER_TEST_CATALOG } from "@/src/lib/starter-test-catalog";

export const seedStarterTestsForOrg = async (orgId: string, actorUserId?: string | null) => {
  const existingQuery = await supabaseServerAdmin
    .from("tests")
    .select("id,test_name")
    .eq("org_id", orgId);

  if (existingQuery.error) {
    return { ok: false as const, error: existingQuery.error.message, count: 0 };
  }

  const existingByName = new Map((existingQuery.data ?? []).map((row) => [row.test_name, row.id]));

  const toInsert = STARTER_TEST_CATALOG
    .filter((test) => !existingByName.has(test.test_name))
    .map((test) => ({ org_id: orgId, ...test }));

  const toUpdate = STARTER_TEST_CATALOG.filter((test) => existingByName.has(test.test_name));

  if (toInsert.length > 0) {
    const insertResult = await supabaseServerAdmin.from("tests").insert(toInsert).select("id");
    if (insertResult.error) {
      return { ok: false as const, error: insertResult.error.message, count: 0 };
    }
  }

  for (const test of toUpdate) {
    const updateResult = await supabaseServerAdmin
      .from("tests")
      .update({
        category: test.category,
        price: test.price,
        units: test.units,
        reference_range: test.reference_range,
        normal_range: test.normal_range,
      })
      .eq("org_id", orgId)
      .eq("test_name", test.test_name);

    if (updateResult.error) {
      return { ok: false as const, error: updateResult.error.message, count: 0 };
    }
  }

  if (actorUserId) {
    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: orgId,
      user_id: actorUserId,
      action: "starter_test_catalog_seeded",
      table_name: "tests",
      record_id: null,
    });
  }

  return { ok: true as const, count: STARTER_TEST_CATALOG.length };
};
