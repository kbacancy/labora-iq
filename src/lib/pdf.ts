import { jsPDF } from "jspdf";

export interface ReportRow {
  testName: string;
  resultValue: string;
  normalRange: string;
  remarks?: string | null;
}

export interface ReportPayload {
  orderId: string;
  labName: string;
  labAddress?: string | null;
  labPhone?: string | null;
  labEmail?: string | null;
  labAccreditation?: string | null;
  reportFooter?: string | null;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  referringDoctor?: string | null;
  createdAt: string;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rows: ReportRow[];
}

interface PdfOptions {
  fileName?: string;
  autoSave?: boolean;
}

export const generateLabReportPdf = (
  payload: ReportPayload,
  options: PdfOptions = { autoSave: true }
) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(payload.labName || "Laboratory Report", 14, 16);
  doc.setFontSize(10);
  if (payload.labAddress) {
    doc.text(payload.labAddress, 14, 22);
  }
  const contactLine = [payload.labPhone, payload.labEmail].filter(Boolean).join(" | ");
  if (contactLine) {
    doc.text(contactLine, 14, 27);
  }
  if (payload.labAccreditation) {
    doc.text(`Accreditation: ${payload.labAccreditation}`, 14, 32);
  }

  doc.setFontSize(11);
  doc.text(`Order ID: ${payload.orderId}`, 14, 42);
  doc.text(`Date: ${new Date(payload.createdAt).toLocaleString()}`, 14, 48);

  doc.text(`Patient: ${payload.patientName}`, 14, 58);
  doc.text(`Age/Gender: ${payload.patientAge} / ${payload.patientGender}`, 14, 64);
  doc.text(`Phone: ${payload.patientPhone}`, 14, 70);
  doc.text(`Referring Doctor: ${payload.referringDoctor || "-"}`, 14, 76);

  let y = 90;
  doc.setFontSize(12);
  doc.text("Test", 14, y);
  doc.text("Result", 80, y);
  doc.text("Normal Range", 130, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 8;

  payload.rows.forEach((row) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.text(row.testName, 14, y);
    doc.text(row.resultValue || "-", 80, y);
    doc.text(row.normalRange || "-", 130, y);
    y += 6;
    if (row.remarks) {
      doc.setFontSize(9);
      doc.text(`Remarks: ${row.remarks}`, 14, y);
      y += 6;
    }
    y += 2;
  });

  const reviewedLine = payload.reviewedByName
    ? `Reviewed by: ${payload.reviewedByName}${payload.reviewedAt ? ` (${new Date(payload.reviewedAt).toLocaleString()})` : ""}`
    : "Reviewed by: -";
  const approvedLine = payload.approvedByName
    ? `Approved by: ${payload.approvedByName}${payload.approvedAt ? ` (${new Date(payload.approvedAt).toLocaleString()})` : ""}`
    : "Approved by: -";

  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  y += 8;
  doc.setFontSize(10);
  doc.text(reviewedLine, 14, y);
  y += 6;
  doc.text(approvedLine, 14, y);

  doc.setFontSize(9);
  doc.text(payload.reportFooter || "This is a system-generated laboratory report.", 14, 285);

  const blob = doc.output("blob");
  if (options.autoSave !== false) {
    doc.save(options.fileName ?? `lab-report-${payload.orderId}.pdf`);
  }

  return blob;
};
