import { CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStatusBadgeProps {
  isPaid: boolean;
  className?: string;
  compact?: boolean;
}

export function PaymentStatusBadge({ 
  isPaid, 
  className,
  compact = false 
}: PaymentStatusBadgeProps) {
  const config = isPaid
    ? {
        icon: CheckCircle,
        label: "Paid",
        className: "text-green-700 bg-green-100 border-green-200",
      }
    : {
        icon: Clock,
        label: "Unpaid",
        className: "text-orange-700 bg-orange-100 border-orange-200",
      };

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
