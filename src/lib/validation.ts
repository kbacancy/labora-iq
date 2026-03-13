import { z } from "zod";

export const roleSchema = z.enum(["admin", "receptionist", "technician"]);
export const patientGenderSchema = z.enum(["Male", "Female", "Other"]);
export const sampleStatusSchema = z.enum(["collected", "received", "in_testing", "completed", "reported"]);

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120, "Name must be at most 120 characters.")
  .refine((value) => !/[\r\n\t]/.test(value), "Name contains invalid characters.");

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must include at least one letter.")
  .regex(/\d/, "Password must include at least one number.");

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name is required.")
  .max(120, "Organization name must be at most 120 characters.");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9()\-\s]{6,19}$/, "Phone number format is invalid.");

const optionalTextField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .refine((value) => !/[\r\n\t]/.test(value), `${label} contains invalid characters.`)
    .transform((value) => value || undefined)
    .optional();

const optionalEmailSchema = z
  .union([emailSchema, z.literal("")])
  .optional()
  .transform((value) => (value ? value.toLowerCase() : undefined));

const optionalPhoneSchema = z
  .union([phoneSchema, z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUuidSchema = z
  .union([z.string().uuid("Value must be a valid UUID."), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalActionUrlSchema = z
  .union([
    z
      .string()
      .trim()
      .min(1)
      .max(240, "Action URL must be at most 240 characters.")
      .refine((value) => value.startsWith("/dashboard"), "Action URL must target a dashboard route."),
    z.literal(""),
  ])
  .optional()
  .transform((value) => (value ? value : undefined));

export const onboardingSchema = z
  .object({
    labName: organizationNameSchema,
    adminFullName: displayNameSchema,
    adminEmail: emailSchema,
    adminPassword: passwordSchema,
    phone: optionalPhoneSchema,
  })
  .strict();

export const publicOnboardingRequestSchema = onboardingSchema
  .extend({
    website: z.string().trim().max(0).optional().transform((value) => value || undefined),
    startedAt: z.string().datetime("Started-at timestamp is invalid."),
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: organizationNameSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(6, "Password must have at least 6 characters."),
  })
  .strict();

export const createUserSchema = z.discriminatedUnion("provisioning", [
  z
    .object({
      provisioning: z.literal("invite"),
      email: emailSchema,
      full_name: displayNameSchema,
      role: roleSchema,
    })
    .strict(),
  z
    .object({
      provisioning: z.literal("password"),
      email: emailSchema,
      password: passwordSchema,
      full_name: displayNameSchema,
      role: roleSchema,
    })
    .strict(),
]);

export const patchUserSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("update_role"),
      role: roleSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("set_disabled"),
      disabled: z.boolean(),
    })
    .strict(),
]);

export const userIdParamSchema = z.string().uuid("User id must be a valid UUID.");

export const patientSchema = z
  .object({
    name: displayNameSchema,
    age: z.coerce.number().int().min(0, "Age must be at least 0.").max(120, "Age must be at most 120."),
    gender: patientGenderSchema,
    phone: phoneSchema,
  })
  .strict();

export const labTestSchema = z
  .object({
    test_name: z
      .string()
      .trim()
      .min(2, "Test name is required.")
      .max(160, "Test name must be at most 160 characters.")
      .refine((value) => !/[\r\n\t]/.test(value), "Test name contains invalid characters."),
    category: optionalTextField("Category", 80),
    price: z.coerce.number().positive("Price must be greater than 0."),
    normal_range: z
      .string()
      .trim()
      .min(1, "Normal range is required.")
      .max(160, "Normal range must be at most 160 characters."),
    reference_range: optionalTextField("Reference range", 160),
    units: optionalTextField("Units", 40),
  })
  .strict();

export const createOrderSchema = z
  .object({
    patient_id: z.string().uuid("Please select a patient."),
    test_ids: z.array(z.string().uuid("Selected test is invalid.")).min(1, "Select at least one test."),
    assigned_to: optionalUuidSchema,
    referring_doctor_name: optionalTextField("Referring doctor name", 120),
  })
  .strict();

export const labSettingsSchema = z
  .object({
    lab_name: organizationNameSchema,
    address: optionalTextField("Address", 240),
    phone: optionalPhoneSchema,
    email: optionalEmailSchema,
    accreditation: optionalTextField("Accreditation", 120),
    report_footer: optionalTextField("Report footer", 500),
  })
  .strict();

export const compliancePolicySchema = z
  .object({
    audit_log_retention_days: z.coerce.number().int().min(30, "Audit log retention must be at least 30 days.").max(3650, "Audit log retention must be at most 3650 days."),
    report_retention_days: z.coerce.number().int().min(30, "Report retention must be at least 30 days.").max(36500, "Report retention must be at most 36500 days."),
    access_review_frequency_days: z.coerce.number().int().min(1, "Access review frequency must be at least 1 day.").max(365, "Access review frequency must be at most 365 days."),
  })
  .strict();

export const auditExportFiltersSchema = z
  .object({
    auditFrom: z.string().trim().optional().transform((value) => value || undefined),
    auditTo: z.string().trim().optional().transform((value) => value || undefined),
    auditAction: optionalTextField("Audit action", 80),
    auditTable: optionalTextField("Audit table", 80),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.auditFrom && Number.isNaN(new Date(value.auditFrom).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["auditFrom"],
        message: "Audit export start date is invalid.",
      });
    }

    if (value.auditTo && Number.isNaN(new Date(value.auditTo).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["auditTo"],
        message: "Audit export end date is invalid.",
      });
    }

    if (
      value.auditFrom &&
      value.auditTo &&
      !Number.isNaN(new Date(value.auditFrom).getTime()) &&
      !Number.isNaN(new Date(value.auditTo).getTime()) &&
      new Date(value.auditFrom).getTime() > new Date(value.auditTo).getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["auditTo"],
        message: "Audit export end date must be after the start date.",
      });
    }
  });

export const createAuditLogSchema = z
  .object({
    action: z
      .string()
      .trim()
      .min(2, "Audit action is required.")
      .max(120, "Audit action must be at most 120 characters."),
    tableName: z
      .string()
      .trim()
      .min(2, "Table name is required.")
      .max(120, "Table name must be at most 120 characters."),
    recordId: optionalUuidSchema,
  })
  .strict();

export const createNotificationSchema = z
  .object({
    recipientUserId: optionalUuidSchema,
    recipientRole: roleSchema.optional(),
    type: z
      .string()
      .trim()
      .min(2, "Notification type is required.")
      .max(120, "Notification type must be at most 120 characters."),
    title: z
      .string()
      .trim()
      .min(2, "Notification title is required.")
      .max(160, "Notification title must be at most 160 characters."),
    message: z
      .string()
      .trim()
      .min(2, "Notification message is required.")
      .max(500, "Notification message must be at most 500 characters."),
    entityType: optionalTextField("Entity type", 120),
    entityId: optionalUuidSchema,
    actionUrl: optionalActionUrlSchema,
  })
  .strict()
  .refine((value) => Boolean(value.recipientUserId || value.recipientRole), {
    message: "Notification recipient is required.",
    path: ["recipientUserId"],
  });

export const updateNotificationReadSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("mark_read"),
      notificationId: z.string().uuid("Notification id must be a valid UUID."),
    })
    .strict(),
  z
    .object({
      action: z.literal("mark_all_read"),
    })
    .strict(),
]);

export const workflowResultRowSchema = z
  .object({
    test_id: z.string().uuid("Test id must be a valid UUID."),
    result_value: z.string().trim().min(1, "Result value is required.").max(200, "Result value must be at most 200 characters."),
    remarks: optionalTextField("Remarks", 500),
  })
  .strict();

export const workflowOrderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_in_progress") }).strict(),
  z
    .object({
      action: z.literal("submit_results"),
      rows: z.array(workflowResultRowSchema).min(1, "At least one result row is required."),
    })
    .strict(),
  z
    .object({
      action: z.literal("set_approval_status"),
      next_status: z.enum(["reviewed", "approved"]),
    })
    .strict(),
]);

export const createSampleSchema = z
  .object({
    patient_id: z.string().uuid("Patient id must be a valid UUID."),
    test_type: z.string().trim().min(2, "Test type is required.").max(120, "Test type must be at most 120 characters."),
    technician_id: optionalUuidSchema,
  })
  .strict();

export const updateSampleWorkflowSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("set_status"),
      status: sampleStatusSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("set_technician"),
      technician_id: optionalUuidSchema,
    })
    .strict(),
]);

export const updatePatientActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("update_details"),
      data: patientSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("set_archived"),
      archived: z.boolean(),
    })
    .strict(),
]);

export const inventoryItemSchema = z
  .object({
    reagent_name: z
      .string()
      .trim()
      .min(2, "Reagent name is required.")
      .max(120, "Reagent name must be at most 120 characters."),
    quantity: z.coerce.number().int().min(0, "Quantity must be at least 0."),
    reorder_level: z.coerce.number().int().min(0, "Reorder level must be at least 0."),
  })
  .strict();

export const parseJsonBody = async (request: Request): Promise<unknown | null> => {
  return request.json().catch(() => null);
};
