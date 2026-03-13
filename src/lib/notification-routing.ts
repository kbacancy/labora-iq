import type { Notification, Role } from "@/src/types/database";

export const resolveNotificationHref = (notification: Notification, role: Role | null): string | null => {
  if (notification.action_url) {
    return notification.action_url;
  }

  const entityId = notification.entity_id;

  switch (notification.type) {
    case "order_assigned":
      return entityId ? `/dashboard/results?orderId=${entityId}` : "/dashboard/results";
    case "results_submitted":
      return entityId ? `/dashboard/results?orderId=${entityId}` : "/dashboard/results";
    case "order_created":
      return "/dashboard/orders";
    case "sample_assigned":
    case "sample_status":
    case "sample_created":
      return entityId ? `/dashboard/samples/${entityId}` : "/dashboard/samples";
    case "report_generated":
    case "report_approved":
      if (role === "receptionist") {
        return "/dashboard/orders";
      }
      return "/dashboard/reports";
    default:
      if (notification.entity_type === "samples") {
        return entityId ? `/dashboard/samples/${entityId}` : "/dashboard/samples";
      }
      if (notification.entity_type === "lab_orders") {
        return role === "technician" && entityId ? `/dashboard/results?orderId=${entityId}` : "/dashboard/orders";
      }
      if (notification.entity_type === "reports") {
        return role === "receptionist" ? "/dashboard/orders" : "/dashboard/reports";
      }
      return "/dashboard/notifications";
  }
};
