import { CheckCircle, Clock } from "lucide-react";
import type { ShipmentStatus } from "@/types/database.types";
import { buildTrackingSteps } from "@/utils/orders/shipment";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TrackingStepsProps {
  shipmentStatus: ShipmentStatus;
  createdAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  trackingNumber?: string | null;
}

export function TrackingSteps({
  shipmentStatus,
  createdAt,
  shippedAt,
  deliveredAt,
  trackingNumber,
}: TrackingStepsProps) {
  const { toast } = useToast();
  const steps = buildTrackingSteps(
    shipmentStatus,
    createdAt,
    shippedAt,
    deliveredAt,
    trackingNumber,
  );

  const formatFullDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Tracking number copied to clipboard",
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = step.completed;
        const isCurrent = step.current;

        return (
          <div key={step.id} className="relative flex gap-5">
            {/* Timeline Column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted
                    ? "bg-[var(--brand-primary)]"
                    : isCurrent
                      ? "bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                      : "bg-gray-100"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Clock
                    className={cn(
                      "w-3.5 h-3.5",
                      isCurrent ? "text-white" : "text-gray-400"
                    )}
                  />
                )}
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 my-1 transition-colors duration-500",
                    isCompleted ? "bg-[var(--brand-primary)]" : "bg-gray-100"
                  )}
                />
              )}
            </div>

            {/* Content Column */}
            <div className={cn("flex-1 pb-10", index === steps.length - 1 && "pb-0")}>
              <h3
                className={cn(
                  "text-base font-bold transition-colors leading-none",
                  isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
                )}
              >
                {step.title}
              </h3>

              {isCompleted && step.date && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">
                  {formatFullDate(step.date)}
                </p>
              )}

              <p
                className={cn(
                  "text-[13px] mt-0.5 leading-relaxed transition-all",
                  isCompleted || isCurrent ? "text-[var(--text-muted)]" : "text-gray-400"
                )}
              >
                {isCompleted || isCurrent ? step.description : "Pending update..."}
              </p>

              {/* Shipped-specific Tracking Number */}
              {step.id === "shipped" && isCompleted && trackingNumber && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-[var(--text-muted)]">
                    Tracking Number: <span className="text-[var(--text-muted)]">{trackingNumber}</span>
                  </span>
                  <button
                    onClick={() => handleCopy(trackingNumber)}
                    className="text-[var(--brand-primary)] hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
