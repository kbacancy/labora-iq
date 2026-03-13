import { describe, expect, it } from "vitest";
import {
  auditExportFiltersSchema,
  compliancePolicySchema,
  createAuditLogSchema,
  createNotificationSchema,
  createSampleSchema,
  createUserSchema,
  createOrderSchema,
  inventoryItemSchema,
  labSettingsSchema,
  labTestSchema,
  loginSchema,
  onboardingSchema,
  publicOnboardingRequestSchema,
  patchUserSchema,
  patientSchema,
  sampleStatusSchema,
  updateNotificationReadSchema,
  updatePatientActionSchema,
  updateOrganizationSchema,
  updateSampleWorkflowSchema,
  userIdParamSchema,
  workflowOrderActionSchema,
} from "@/src/lib/validation";

describe("onboardingSchema", () => {
  it("accepts valid payload and normalizes admin email", () => {
    const result = onboardingSchema.safeParse({
      labName: "Bacancy Laboratory",
      adminFullName: "Jack Smith",
      adminEmail: " JACK.ADMIN@YOPMAIL.COM ",
      adminPassword: "Password123",
      phone: "+1 (555) 123-4567",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.adminEmail).toBe("jack.admin@yopmail.com");
  });

  it("rejects invalid password and unknown fields", () => {
    const result = onboardingSchema.safeParse({
      labName: "Lab",
      adminFullName: "Jack",
      adminEmail: "jack.admin@yopmail.com",
      adminPassword: "password",
      extra: "not-allowed",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a blank optional phone value", () => {
    const result = onboardingSchema.safeParse({
      labName: "Bacancy Laboratory",
      adminFullName: "Jack Smith",
      adminEmail: "jack.admin@yopmail.com",
      adminPassword: "Password123",
      phone: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.phone).toBeUndefined();
  });
});

describe("publicOnboardingRequestSchema", () => {
  it("accepts valid onboarding requests with bot-defense fields", () => {
    const result = publicOnboardingRequestSchema.safeParse({
      labName: "Bacancy Laboratory",
      adminFullName: "Jack Smith",
      adminEmail: " JACK.ADMIN@YOPMAIL.COM ",
      adminPassword: "Password123",
      phone: "+1 (555) 123-4567",
      website: "",
      startedAt: "2026-03-12T09:30:00.000Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.adminEmail).toBe("jack.admin@yopmail.com");
    expect(result.data.website).toBeUndefined();
  });

  it("rejects filled honeypot fields", () => {
    const result = publicOnboardingRequestSchema.safeParse({
      labName: "Bacancy Laboratory",
      adminFullName: "Jack Smith",
      adminEmail: "jack.admin@yopmail.com",
      adminPassword: "Password123",
      website: "https://spam.example",
      startedAt: "2026-03-12T09:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts invite payload", () => {
    const result = createUserSchema.safeParse({
      provisioning: "invite",
      email: "  JOHN.TECH1010@YOPMAIL.COM ",
      full_name: "John Smith",
      role: "technician",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("john.tech1010@yopmail.com");
  });

  it("accepts password provisioning payload", () => {
    const result = createUserSchema.safeParse({
      provisioning: "password",
      email: "jane.reception@yopmail.com",
      password: "Secure123",
      full_name: "Jane Reception",
      role: "receptionist",
    });

    expect(result.success).toBe(true);
  });

  it("rejects weak password and unexpected keys", () => {
    const result = createUserSchema.safeParse({
      provisioning: "password",
      email: "jane.reception@yopmail.com",
      password: "abcdefgh",
      full_name: "Jane Reception",
      role: "receptionist",
      unknown: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("updateOrganizationSchema", () => {
  it("accepts valid organization name", () => {
    const result = updateOrganizationSchema.safeParse({ name: "Acme Diagnostics" });
    expect(result.success).toBe(true);
  });

  it("rejects blank organization name", () => {
    const result = updateOrganizationSchema.safeParse({ name: " " });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials and normalizes email", () => {
    const result = loginSchema.safeParse({ email: " ADMIN@LABORAIQ.COM ", password: "secret123" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("admin@laboraiq.com");
  });

  it("rejects too-short passwords", () => {
    const result = loginSchema.safeParse({ email: "admin@laboraiq.com", password: "123" });
    expect(result.success).toBe(false);
  });
});

describe("patchUserSchema", () => {
  it("accepts role update payload", () => {
    const result = patchUserSchema.safeParse({ action: "update_role", role: "admin" });
    expect(result.success).toBe(true);
  });

  it("accepts disable payload", () => {
    const result = patchUserSchema.safeParse({ action: "set_disabled", disabled: true });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role and extra properties", () => {
    const result = patchUserSchema.safeParse({
      action: "update_role",
      role: "owner",
      disabled: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("userIdParamSchema", () => {
  it("accepts a valid UUID", () => {
    const result = userIdParamSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    const result = userIdParamSchema.safeParse("john-admin-1010");
    expect(result.success).toBe(false);
  });
});

describe("patientSchema", () => {
  it("accepts valid patient data", () => {
    const result = patientSchema.safeParse({
      name: "Mary Johnson",
      age: "32",
      gender: "Female",
      phone: "+1 555 123 4567",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.age).toBe(32);
  });

  it("rejects invalid phone numbers", () => {
    const result = patientSchema.safeParse({
      name: "Mary Johnson",
      age: 32,
      gender: "Female",
      phone: "abc",
    });

    expect(result.success).toBe(false);
  });
});

describe("labTestSchema", () => {
  it("accepts valid test details", () => {
    const result = labTestSchema.safeParse({
      test_name: "Complete Blood Count",
      category: "Hematology",
      price: "499.50",
      normal_range: "4.5 - 11.0",
      reference_range: "",
      units: "10^3/uL",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.price).toBe(499.5);
    expect(result.data.reference_range).toBeUndefined();
  });

  it("rejects non-positive price", () => {
    const result = labTestSchema.safeParse({
      test_name: "CBC",
      price: 0,
      normal_range: "4.5 - 11.0",
    });

    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepts valid order payload", () => {
    const result = createOrderSchema.safeParse({
      patient_id: "550e8400-e29b-41d4-a716-446655440000",
      test_ids: ["550e8400-e29b-41d4-a716-446655440001"],
      assigned_to: "",
      referring_doctor_name: " Dr. Arjun Patel ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.assigned_to).toBeUndefined();
    expect(result.data.referring_doctor_name).toBe("Dr. Arjun Patel");
  });

  it("rejects empty test lists", () => {
    const result = createOrderSchema.safeParse({
      patient_id: "550e8400-e29b-41d4-a716-446655440000",
      test_ids: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("labSettingsSchema", () => {
  it("accepts valid settings and normalizes blanks", () => {
    const result = labSettingsSchema.safeParse({
      lab_name: "Acme Diagnostics",
      address: " 21 Main Street ",
      phone: "",
      email: " CONTACT@ACME.COM ",
      accreditation: "",
      report_footer: " Final reports are clinician-reviewed. ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.phone).toBeUndefined();
    expect(result.data.email).toBe("contact@acme.com");
    expect(result.data.report_footer).toBe("Final reports are clinician-reviewed.");
  });

  it("rejects invalid optional email values", () => {
    const result = labSettingsSchema.safeParse({
      lab_name: "Acme Diagnostics",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });
});

describe("compliancePolicySchema", () => {
  it("accepts valid policy values", () => {
    const result = compliancePolicySchema.safeParse({
      audit_log_retention_days: "365",
      report_retention_days: "2555",
      access_review_frequency_days: "30",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.audit_log_retention_days).toBe(365);
  });

  it("rejects too-small retention windows", () => {
    const result = compliancePolicySchema.safeParse({
      audit_log_retention_days: 7,
      report_retention_days: 15,
      access_review_frequency_days: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("auditExportFiltersSchema", () => {
  it("accepts valid filters", () => {
    const result = auditExportFiltersSchema.safeParse({
      auditFrom: "2026-03-01T00:00",
      auditTo: "2026-03-02T00:00",
      auditAction: " results ",
      auditTable: " lab_orders ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.auditAction).toBe("results");
    expect(result.data.auditTable).toBe("lab_orders");
  });

  it("rejects reversed date windows", () => {
    const result = auditExportFiltersSchema.safeParse({
      auditFrom: "2026-03-03T00:00",
      auditTo: "2026-03-02T00:00",
    });

    expect(result.success).toBe(false);
  });
});

describe("createAuditLogSchema", () => {
  it("accepts valid audit payload", () => {
    const result = createAuditLogSchema.safeParse({
      action: "patient_archived",
      tableName: "patients",
      recordId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid record ids", () => {
    const result = createAuditLogSchema.safeParse({
      action: "patient_archived",
      tableName: "patients",
      recordId: "abc",
    });

    expect(result.success).toBe(false);
  });
});

describe("createNotificationSchema", () => {
  it("accepts role-based notifications", () => {
    const result = createNotificationSchema.safeParse({
      recipientRole: "admin",
      type: "order_created",
      title: "Order Created",
      message: "A new order was created.",
      entityType: "lab_orders",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
  });

  it("requires a recipient target", () => {
    const result = createNotificationSchema.safeParse({
      type: "order_created",
      title: "Order Created",
      message: "A new order was created.",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateNotificationReadSchema", () => {
  it("accepts single notification read updates", () => {
    const result = updateNotificationReadSchema.safeParse({
      action: "mark_read",
      notificationId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
  });

  it("accepts mark-all updates", () => {
    const result = updateNotificationReadSchema.safeParse({
      action: "mark_all_read",
    });

    expect(result.success).toBe(true);
  });
});

describe("workflowOrderActionSchema", () => {
  it("accepts result submission payloads", () => {
    const result = workflowOrderActionSchema.safeParse({
      action: "submit_results",
      rows: [
        {
          test_id: "550e8400-e29b-41d4-a716-446655440000",
          result_value: "Positive",
          remarks: " Confirmed ",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.data.action !== "submit_results") return;
    expect(result.data.rows[0]?.remarks).toBe("Confirmed");
  });

  it("rejects unknown workflow actions", () => {
    const result = workflowOrderActionSchema.safeParse({ action: "delete_order" });
    expect(result.success).toBe(false);
  });
});

describe("createSampleSchema", () => {
  it("accepts valid sample creation payloads", () => {
    const result = createSampleSchema.safeParse({
      patient_id: "550e8400-e29b-41d4-a716-446655440000",
      test_type: " CBC ",
      technician_id: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.test_type).toBe("CBC");
    expect(result.data.technician_id).toBeUndefined();
  });

  it("rejects invalid patient ids", () => {
    const result = createSampleSchema.safeParse({
      patient_id: "abc",
      test_type: "CBC",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateSampleWorkflowSchema", () => {
  it("accepts status updates", () => {
    const result = updateSampleWorkflowSchema.safeParse({
      action: "set_status",
      status: "received",
    });

    expect(result.success).toBe(true);
  });

  it("accepts technician assignment updates", () => {
    const result = updateSampleWorkflowSchema.safeParse({
      action: "set_technician",
      technician_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
  });
});

describe("updatePatientActionSchema", () => {
  it("accepts patient detail updates", () => {
    const result = updatePatientActionSchema.safeParse({
      action: "update_details",
      data: {
        name: "Mary Johnson",
        age: "33",
        gender: "Female",
        phone: "+1 555 123 4567",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.data.action !== "update_details") return;
    expect(result.data.data.age).toBe(33);
  });

  it("accepts archive toggles", () => {
    const result = updatePatientActionSchema.safeParse({
      action: "set_archived",
      archived: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid update actions", () => {
    const result = updatePatientActionSchema.safeParse({
      action: "update_details",
      archived: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("inventoryItemSchema", () => {
  it("accepts valid inventory payloads", () => {
    const result = inventoryItemSchema.safeParse({
      reagent_name: "  Sodium Citrate  ",
      quantity: "12",
      reorder_level: "5",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.reagent_name).toBe("Sodium Citrate");
    expect(result.data.quantity).toBe(12);
    expect(result.data.reorder_level).toBe(5);
  });

  it("rejects negative inventory values", () => {
    const result = inventoryItemSchema.safeParse({
      reagent_name: "EDTA",
      quantity: -1,
      reorder_level: 2,
    });

    expect(result.success).toBe(false);
  });
});

describe("sampleStatusSchema", () => {
  it("rejects invalid statuses", () => {
    const result = sampleStatusSchema.safeParse("archived");
    expect(result.success).toBe(false);
  });
});
