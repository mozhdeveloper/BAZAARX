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
    <div className={`p-4 bg-gray-50 rounded-xl ${className || ""}`.trim()}>
      <div className="flex items-center gap-3 mb-3">
        <MapPin className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      <div className="text-sm text-gray-600 leading-relaxed">
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
