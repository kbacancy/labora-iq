import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { inventoryItemSchema, parseJsonBody } from "@/src/lib/validation";

export async function PUT(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = inventoryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { error } = await supabaseServerAdmin.from("inventory").upsert(
    {
      org_id: authResult.orgId,
      reagent_name: parsed.data.reagent_name,
      quantity: parsed.data.quantity,
      reorder_level: parsed.data.reorder_level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,reagent_name" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "inventory_updated",
    table_name: "inventory",
    record_id: parsed.data.reagent_name,
  });

  return NextResponse.json({ message: "Inventory updated." });
}
