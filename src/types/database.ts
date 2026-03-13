export type Role = "admin" | "receptionist" | "technician";

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Patient {
  id: string;
  org_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  created_by: string | null;
}

export interface LabTest {
  id: string;
  org_id: string;
  test_name: string;
  category: string | null;
  price: number;
  normal_range: string;
  reference_range: string | null;
  units: string | null;
  created_at: string;
}

export type OrderStatus = "pending" | "in_progress" | "completed";

export interface LabOrder {
  id: string;
  org_id: string;
  patient_id: string;
  status: OrderStatus;
  total_price: number;
  referring_doctor_name: string | null;
  approval_status: "draft" | "reviewed" | "approved";
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
}

export interface OrderTest {
  id: string;
  org_id: string;
  order_id: string;
  test_id: string;
}

export interface Result {
  id: string;
  org_id: string;
  order_id: string;
  test_id: string;
  result_value: string;
  remarks: string | null;
  entered_by: string | null;
  created_at: string;
}

export interface Sample {
  id: string;
  org_id: string;
  sample_code: string;
  patient_name: string;
  patient_id: string;
  test_type: string;
  technician_id: string | null;
  status: "collected" | "received" | "in_testing" | "completed" | "reported";
  order_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReportRecord {
  id: string;
  org_id: string;
  sample_id: string | null;
  order_id: string | null;
  file_url: string;
  approved_by: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  org_id: string;
  reagent_name: string;
  quantity: number;
  reorder_level: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  timestamp: string;
}

export interface Notification {
  id: string;
  org_id: string;
  recipient_user_id: string | null;
  recipient_role: Role | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CompliancePolicy {
  id: string;
  org_id: string;
  singleton: boolean;
  audit_log_retention_days: number;
  report_retention_days: number;
  access_review_frequency_days: number;
  last_access_review_at: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: Role;
  full_name: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Profile>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Organization>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<OrganizationMember>;
      };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Patient>;
      };
      tests: {
        Row: LabTest;
        Insert: Omit<LabTest, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<LabTest>;
      };
      lab_orders: {
        Row: LabOrder;
        Insert: Omit<LabOrder, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<LabOrder>;
      };
      lab_settings: {
        Row: {
          id: string;
          singleton: boolean;
          lab_name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          accreditation: string | null;
          report_footer: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          singleton?: boolean;
          lab_name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          accreditation?: string | null;
          report_footer?: string | null;
          updated_at?: string;
        };
        Update: {
          singleton?: boolean;
          lab_name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          accreditation?: string | null;
          report_footer?: string | null;
          updated_at?: string;
        };
      };
      order_tests: {
        Row: OrderTest;
        Insert: Omit<OrderTest, "id"> & { id?: string };
        Update: Partial<OrderTest>;
      };
      results: {
        Row: Result;
        Insert: Omit<Result, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Result>;
      };
      samples: {
        Row: Sample;
        Insert: Omit<Sample, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Sample>;
      };
      reports: {
        Row: ReportRecord;
        Insert: Omit<ReportRecord, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<ReportRecord>;
      };
      inventory: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, "id" | "updated_at"> & { id?: string; updated_at?: string };
        Update: Partial<InventoryItem>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "timestamp"> & { id?: string; timestamp?: string };
        Update: Partial<AuditLog>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at" | "is_read"> & { id?: string; created_at?: string; is_read?: boolean };
        Update: Partial<Notification>;
      };
      compliance_policies: {
        Row: CompliancePolicy;
        Insert: Omit<CompliancePolicy, "id" | "updated_at"> & { id?: string; updated_at?: string };
        Update: Partial<CompliancePolicy>;
      };
    };
  };
}
