import { NextRequest, NextResponse } from "next/server";
import { assertAdminFromRequest } from "@/src/lib/admin-auth";
import { seedStarterTestsForOrg } from "@/src/lib/seed-starter-tests";

export async function POST(request: NextRequest) {
  const authResult = await assertAdminFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const seeded = await seedStarterTestsForOrg(authResult.orgId, authResult.userId);
  if (!seeded.ok) {
    return NextResponse.json({ error: seeded.error }, { status: 500 });
  }

  return NextResponse.json({
    message: `Starter catalog loaded with ${seeded.count} tests.`,
    count: seeded.count,
  });
}
