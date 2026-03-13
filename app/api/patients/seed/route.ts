import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { seedStarterPatientsForOrg } from "@/src/lib/seed-starter-patients";

export async function POST(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const seeded = await seedStarterPatientsForOrg(authResult.orgId, authResult.userId);
  if (!seeded.ok) {
    return NextResponse.json({ error: seeded.error }, { status: 500 });
  }

  return NextResponse.json({
    message:
      seeded.count > 0
        ? `Loaded ${seeded.count} demo patients into the registry.`
        : "Demo patients are already loaded for this lab.",
    count: seeded.count,
    total: seeded.total,
  });
}
