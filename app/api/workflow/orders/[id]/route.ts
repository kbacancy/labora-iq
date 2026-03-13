import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { parseJsonBody, userIdParamSchema, workflowOrderActionSchema } from "@/src/lib/validation";

const canWorkOnOrder = (role: string, userId: string, assignedTo: string | null, status: string) =>
  role === "admin" || (role === "technician" && (assignedTo === userId || status === "pending"));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await params;
  const validatedId = userIdParamSchema.safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json({ error: validatedId.error.issues[0]?.message ?? "Order id is required." }, { status: 400 });
  }

  const body = await parseJsonBody(request);
  const parsed = workflowOrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data: actorProfile } = await supabaseServerAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", authResult.userId)
    .eq("org_id", authResult.orgId)
    .single();

  const { data: order, error: orderError } = await supabaseServerAdmin
    .from("lab_orders")
    .select("id,org_id,status,approval_status,assigned_to,patients(name)")
    .eq("id", validatedId.data)
    .single();

  if (orderError || !order || order.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Order not found in your organization." }, { status: 404 });
  }

  const orderPatients = order.patients as { name: string }[] | { name: string } | null;
  const patientName = Array.isArray(orderPatients) ? orderPatients[0]?.name : orderPatients?.name;
  const orderSubject = patientName ? `for ${patientName}` : "for the selected patient";

  if (parsed.data.action === "mark_in_progress") {
    if (!canWorkOnOrder(authResult.role, authResult.userId, order.assigned_to, order.status)) {
      return NextResponse.json({ error: "You cannot start this order." }, { status: 403 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ message: "Order already started.", data: { status: order.status } });
    }

    const { error } = await supabaseServerAdmin
      .from("lab_orders")
      .update({ status: "in_progress" })
      .eq("id", order.id)
      .eq("org_id", authResult.orgId)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: authResult.orgId,
      user_id: authResult.userId,
      action: "order_in_progress",
      table_name: "lab_orders",
      record_id: order.id,
    });

    return NextResponse.json({ message: "Order started.", data: { status: "in_progress" } });
  }

  if (parsed.data.action === "submit_results") {
    if (!canWorkOnOrder(authResult.role, authResult.userId, order.assigned_to, order.status)) {
      return NextResponse.json({ error: "You cannot submit results for this order." }, { status: 403 });
    }

    const { data: orderTests, error: orderTestsError } = await supabaseServerAdmin
      .from("order_tests")
      .select("test_id")
      .eq("order_id", order.id)
      .eq("org_id", authResult.orgId);

    if (orderTestsError) {
      return NextResponse.json({ error: orderTestsError.message }, { status: 500 });
    }

    const expectedTestIds = new Set((orderTests ?? []).map((row) => row.test_id));
    const receivedTestIds = new Set(parsed.data.rows.map((row) => row.test_id));
    if (expectedTestIds.size === 0) {
      return NextResponse.json({ error: "Order has no tests configured." }, { status: 400 });
    }
    if (
      expectedTestIds.size !== receivedTestIds.size ||
      [...expectedTestIds].some((testId) => !receivedTestIds.has(testId))
    ) {
      return NextResponse.json({ error: "Results must match the exact tests on the order." }, { status: 400 });
    }

    const resultPayload = parsed.data.rows.map((row) => ({
      org_id: authResult.orgId,
      order_id: order.id,
      test_id: row.test_id,
      result_value: row.result_value,
      remarks: row.remarks ?? null,
      entered_by: authResult.userId,
    }));

    const { error: resultError } = await supabaseServerAdmin
      .from("results")
      .upsert(resultPayload, { onConflict: "order_id,test_id" });

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    const { error: updateError } = await supabaseServerAdmin
      .from("lab_orders")
      .update({
        status: "completed",
        approval_status: "draft",
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        approved_by: null,
        approved_by_name: null,
        approved_at: null,
        completed_at: new Date().toISOString(),
        completed_by: authResult.userId,
      })
      .eq("id", order.id)
      .eq("org_id", authResult.orgId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseServerAdmin.from("audit_logs").insert({
      org_id: authResult.orgId,
      user_id: authResult.userId,
      action: "results_saved",
      table_name: "results",
      record_id: order.id,
    });
    await supabaseServerAdmin.from("notifications").insert({
      org_id: authResult.orgId,
      recipient_user_id: null,
      recipient_role: "admin",
      type: "results_submitted",
      title: "Results Submitted",
      message: `Results were submitted ${orderSubject}.`,
      entity_type: "lab_orders",
      entity_id: order.id,
      action_url: `/dashboard/results?orderId=${order.id}`,
      created_by: authResult.userId,
    });

    return NextResponse.json({ message: "Results saved and order marked as completed." });
  }

  if (authResult.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const now = new Date().toISOString();
  if (parsed.data.next_status === "approved" && order.status !== "completed") {
    return NextResponse.json({ error: "Only completed orders can be approved." }, { status: 400 });
  }

  const approvalPayload =
    parsed.data.next_status === "reviewed"
      ? {
          approval_status: "reviewed" as const,
          reviewed_by: authResult.userId,
          reviewed_by_name: actorProfile?.full_name ?? "Admin",
          reviewed_at: now,
        }
      : {
          approval_status: "approved" as const,
          approved_by: authResult.userId,
          approved_by_name: actorProfile?.full_name ?? "Admin",
          approved_at: now,
        };

  const { error } = await supabaseServerAdmin
    .from("lab_orders")
    .update(approvalPayload)
    .eq("id", order.id)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: parsed.data.next_status === "reviewed" ? "report_reviewed" : "report_approved",
    table_name: "lab_orders",
    record_id: order.id,
  });

  if (parsed.data.next_status === "approved") {
    await supabaseServerAdmin.from("notifications").insert([
      {
        org_id: authResult.orgId,
        recipient_user_id: null,
        recipient_role: "technician",
        type: "report_approved",
        title: "Report Approved",
        message: patientName ? `Report for ${patientName} has been approved.` : "A report has been approved.",
        entity_type: "lab_orders",
        entity_id: order.id,
        action_url: "/dashboard/reports",
        created_by: authResult.userId,
      },
      {
        org_id: authResult.orgId,
        recipient_user_id: null,
        recipient_role: "receptionist",
        type: "report_approved",
        title: "Report Approved",
        message: patientName ? `Report for ${patientName} is now ready.` : "A report is now ready.",
        entity_type: "lab_orders",
        entity_id: order.id,
        action_url: "/dashboard/orders",
        created_by: authResult.userId,
      },
    ]);
  }

  return NextResponse.json({
    message: parsed.data.next_status === "reviewed" ? "Order reviewed." : "Order approved.",
  });
}
