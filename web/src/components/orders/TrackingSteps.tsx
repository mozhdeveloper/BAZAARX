import { CheckCircle, Clock } from "lucide-react";
import type { ShipmentStatus } from "@/types/database.types";
import { buildTrackingSteps } from "@/utils/orders/shipment";
import { cn } from "@/lib/utils";

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
  const steps = buildTrackingSteps(
    shipmentStatus,
    createdAt,
    shippedAt,
    deliveredAt,
    trackingNumber,
  );

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = step.completed;
        const isCurrent = step.current;

        return (
          <div key={step.id} className="flex items-start gap-4">
            <div
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2",
                isCompleted
                  ? "bg-green-100 border-green-200 text-green-600"
                  : isCurrent
                    ? "bg-blue-100 border-blue-200 text-blue-600 animate-pulse"
                    : "bg-gray-100 border-gray-200 text-gray-400",
              )}
            >
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className={cn(
                      "font-medium",
                      isCompleted || isCurrent ? "text-gray-900" : "text-gray-500",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      "text-sm mt-1",
                      isCompleted || isCurrent ? "text-gray-600" : "text-gray-400",
                    )}
                  >
                    {step.description}
                  </p>
                </div>
                {step.time && (
                  <span
                    className={cn(
                      "text-xs",
                      isCompleted || isCurrent ? "text-gray-500" : "text-gray-400",
                    )}
                  >
                    {step.time}
                  </span>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className={cn("w-0.5 h-6 ml-5 mt-2", isCompleted ? "bg-green-200" : "bg-gray-200")} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
