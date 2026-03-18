import { MapPin } from "lucide-react";
import type { NormalizedShippingAddress } from "@/types/orders";

interface ShippingAddressCardProps {
  address: NormalizedShippingAddress;
  title?: string;
  className?: string;
}

export function ShippingAddressCard({
  address,
  title = "Delivery Address",
  className,
}: ShippingAddressCardProps) {
  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className || ""}`.trim()}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </div>
      <div className="text-xs text-gray-600 leading-relaxed">
        <div className="font-medium">{address.fullName}</div>
        <div>{address.street}</div>
        <div>
          {address.city}, {address.province} {address.postalCode}
        </div>
        {address.phone && <div>{address.phone}</div>}
      </div>
    </div>
  );
}
