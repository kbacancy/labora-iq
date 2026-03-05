"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { generateLabReportPdf, type ReportPayload } from "@/src/lib/pdf";
import { createAuditLog } from "@/src/lib/audit";
import { useAuth } from "@/src/context/AuthContext";
import { createNotification } from "@/src/lib/notifications";

interface DownloadReportButtonProps {
  orderId: string;
}

export const DownloadReportButton = ({ orderId }: DownloadReportButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("lab_orders")
        .select(
          `
            id,
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
        .eq("id", orderId)
        .single();

      if (queryError || !data) {
        throw new Error(queryError?.message ?? "Unable to generate report.");
      }

      const patient = Array.isArray(data.patients) ? data.patients[0] : data.patients;
      const orderTests = Array.isArray(data.order_tests) ? data.order_tests : [];
      const results = Array.isArray(data.results) ? data.results : [];

      const rows = orderTests.map((item: { test_id: string; tests: { test_name: string; normal_range: string }[] | { test_name: string; normal_range: string } }) => {
        const rowResult = results.find((result: { test_id: string }) => result.test_id === item.test_id);
        const testInfo = Array.isArray(item.tests) ? item.tests[0] : item.tests;
        return {
          testName: testInfo?.test_name ?? "-",
          normalRange: testInfo?.normal_range ?? "-",
          resultValue: rowResult?.result_value ?? "-",
          remarks: rowResult?.remarks ?? null,
        };
      });

      const { data: settingsData } = await supabase
        .from("lab_settings")
        .select("lab_name,address,phone,email,accreditation,report_footer")
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

      const blob = generateLabReportPdf(payload, { autoSave: false });
      const filePath = `${data.id}/${Date.now()}.pdf`;
      const file = new File([blob], `lab-report-${data.id}.pdf`, { type: "application/pdf" });

      const { error: uploadError } = await supabase.storage
        .from("lab-reports")
        .upload(filePath, file, { upsert: false, contentType: "application/pdf" });

      if (uploadError) {
        generateLabReportPdf(payload, { autoSave: true });
        throw new Error(`Storage upload failed: ${uploadError.message}. Local download generated instead.`);
      }

      const { data: publicUrlData } = supabase.storage.from("lab-reports").getPublicUrl(filePath);
      const fileUrl = publicUrlData.publicUrl;

      const { data: sampleRow } = await supabase
        .from("samples")
        .select("id")
        .eq("order_id", data.id)
        .maybeSingle();

      const { error: reportInsertError } = await supabase.from("reports").insert({
        sample_id: sampleRow?.id ?? null,
        order_id: data.id,
        file_url: fileUrl,
        approved_by: user?.id ?? null,
      });

      if (reportInsertError) {
        throw new Error(reportInsertError.message);
      }

      await createAuditLog({
        userId: user?.id ?? null,
        action: "report_generated",
        tableName: "reports",
        recordId: data.id,
      });
      await createNotification({
        recipientRole: "admin",
        type: "report_generated",
        title: "Report Generated",
        message: `A report has been generated for order ${data.id.slice(0, 8)}.`,
        entityType: "reports",
        entityId: data.id,
        createdBy: user?.id ?? null,
      });
      await createNotification({
        recipientRole: "receptionist",
        type: "report_generated",
        title: "Report Ready",
        message: `Report is available for order ${data.id.slice(0, 8)}.`,
        entityType: "reports",
        entityId: data.id,
        createdBy: user?.id ?? null,
      });

      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onDownload}
        disabled={loading}
        className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Preparing..." : "Download Report"}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
};
