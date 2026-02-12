import { Clock, Package, Truck, CheckCircle, XCircle, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderUiStatus } from "@/types/orders";

interface OrderStatusBadgeProps {
  status: OrderUiStatus | string;
  className?: string;
  compact?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "pending":
      return {
        icon: Clock,
        label: "Pending",
        className: "text-yellow-700 bg-yellow-100 border-yellow-200",
      };
    case "confirmed":
      return {
        icon: Package,
        label: "Confirmed",
        className: "text-blue-700 bg-blue-100 border-blue-200",
      };
    case "shipped":
      return {
        icon: Truck,
        label: "Shipped",
        className: "text-purple-700 bg-purple-100 border-purple-200",
      };
    case "delivered":
      return {
        icon: CheckCircle,
        label: "Delivered",
        className: "text-green-700 bg-green-100 border-green-200",
      };
    case "cancelled":
      return {
        icon: XCircle,
        label: "Cancelled",
        className: "text-red-700 bg-red-100 border-red-200",
      };
    case "returned":
      return {
        icon: RotateCcw,
        label: "Returned",
        className: "text-orange-700 bg-orange-100 border-orange-200",
      };
    case "reviewed":
      return {
        icon: Star,
        label: "Reviewed",
        className: "text-yellow-700 bg-yellow-100 border-yellow-200",
      };
    default:
      return {
        icon: Package,
        label: "Unknown",
        className: "text-gray-700 bg-gray-100 border-gray-200",
      };
  }
};

export function OrderStatusBadge({ status, className, compact = false }: OrderStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className,
        className,
      )}
    >
      <Icon className={compact ? "w-3 h-3" : "w-4 h-4"} />
      {config.label}
    </span>
  );
}
