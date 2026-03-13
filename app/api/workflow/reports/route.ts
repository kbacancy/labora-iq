import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedFromRequest } from "@/src/lib/admin-auth";
import { generateLabReportPdfArrayBuffer, type ReportPayload } from "@/src/lib/pdf";
import { supabaseServerAdmin } from "@/src/lib/supabase-server";
import { parseJsonBody } from "@/src/lib/validation";
import { z } from "zod";

const createReportSchema = z
  .object({
    orderId: z.string().uuid("Order id must be a valid UUID."),
  })
  .strict();

export async function POST(request: NextRequest) {
  const authResult = await assertAuthenticatedFromRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const body = await parseJsonBody(request);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { data, error } = await supabaseServerAdmin
    .from("lab_orders")
    .select(
      `
        id,
        org_id,
        status,
        approval_status,
        created_at,
        referring_doctor_name,
        reviewed_by_name,
        reviewed_at,
        approved_by_name,
        approved_at,
        patients(name, age, gender, phone),
        order_tests(
          test_id,
          tests(test_name, normal_range)
        ),
        results(test_id, result_value, remarks)
      `
    )
    .eq("id", parsed.data.orderId)
    .single();

  if (error || !data || data.org_id !== authResult.orgId) {
    return NextResponse.json({ error: "Order not found in your organization." }, { status: 404 });
  }

  if (data.status !== "completed" || data.approval_status !== "approved") {
    return NextResponse.json({ error: "Only approved completed orders can generate reports." }, { status: 400 });
  }

  const patient = Array.isArray(data.patients) ? data.patients[0] : data.patients;
  const orderTests = Array.isArray(data.order_tests) ? data.order_tests : [];
  const results = Array.isArray(data.results) ? data.results : [];

  const rows = orderTests.map(
    (item: {
      test_id: string;
      tests: { test_name: string; normal_range: string }[] | { test_name: string; normal_range: string } | null;
    }) => {
      const rowResult = results.find((result: { test_id: string }) => result.test_id === item.test_id);
      const testInfo = Array.isArray(item.tests) ? item.tests[0] : item.tests;
      return {
        testName: testInfo?.test_name ?? "-",
        normalRange: testInfo?.normal_range ?? "-",
        resultValue: rowResult?.result_value ?? "-",
        remarks: rowResult?.remarks ?? null,
      };
    }
  );

  const { data: settingsData } = await supabaseServerAdmin
    .from("lab_settings")
    .select("lab_name,address,phone,email,accreditation,report_footer")
    .eq("org_id", authResult.orgId)
    .eq("singleton", true)
    .maybeSingle();

  const payload: ReportPayload = {
    orderId: data.id,
    labName: settingsData?.lab_name ?? "LaboraIQ Laboratory",
    labAddress: settingsData?.address ?? null,
    labPhone: settingsData?.phone ?? null,
    labEmail: settingsData?.email ?? null,
    labAccreditation: settingsData?.accreditation ?? null,
    reportFooter: settingsData?.report_footer ?? null,
    patientName: patient?.name ?? "-",
    patientAge: patient?.age ?? 0,
    patientGender: patient?.gender ?? "-",
    patientPhone: patient?.phone ?? "-",
    referringDoctor: data.referring_doctor_name ?? null,
    createdAt: data.created_at,
    reviewedByName: data.reviewed_by_name ?? null,
    reviewedAt: data.reviewed_at ?? null,
    approvedByName: data.approved_by_name ?? null,
    approvedAt: data.approved_at ?? null,
    rows,
  };

  const pdfBytes = generateLabReportPdfArrayBuffer(payload);
  const filePath = `${data.id}/${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseServerAdmin.storage
    .from("lab-reports")
    .upload(filePath, pdfBytes, { upsert: false, contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseServerAdmin.storage.from("lab-reports").getPublicUrl(filePath);
  const fileUrl = publicUrlData.publicUrl;

  const { data: sampleRow } = await supabaseServerAdmin
    .from("samples")
    .select("id")
    .eq("org_id", authResult.orgId)
    .eq("order_id", data.id)
    .maybeSingle();

  const { error: reportInsertError } = await supabaseServerAdmin.from("reports").insert({
    org_id: authResult.orgId,
    sample_id: sampleRow?.id ?? null,
    order_id: data.id,
    file_url: fileUrl,
    approved_by: authResult.userId,
  });

  if (reportInsertError) {
    return NextResponse.json({ error: reportInsertError.message }, { status: 500 });
  }

  await supabaseServerAdmin.from("audit_logs").insert({
    org_id: authResult.orgId,
    user_id: authResult.userId,
    action: "report_generated",
    table_name: "reports",
    record_id: data.id,
  });
  await supabaseServerAdmin.from("notifications").insert([
    {
      org_id: authResult.orgId,
      recipient_user_id: null,
      recipient_role: "admin",
      type: "report_generated",
      title: "Report Generated",
      message: patient?.name ? `A report has been generated for ${patient.name}.` : "A new report has been generated.",
      entity_type: "reports",
      entity_id: data.id,
      action_url: "/dashboard/reports",
      created_by: authResult.userId,
    },
    {
      org_id: authResult.orgId,
      recipient_user_id: null,
      recipient_role: "receptionist",
      type: "report_generated",
      title: "Report Ready",
      message: patient?.name ? `Report is available for ${patient.name}.` : "A report is ready for release.",
      entity_type: "reports",
      entity_id: data.id,
      action_url: "/dashboard/orders",
      created_by: authResult.userId,
    },
  ]);

  return NextResponse.json({ data: { fileUrl }, message: "Report generated." }, { status: 201 });
}
