export interface LegacyShippingAddress {
  fullName?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
}

export interface LegacyPricingSummary {
  subtotal?: number;
  shipping?: number;
  tax?: number;
  campaignDiscount?: number;
  voucherDiscount?: number;
  bazcoinDiscount?: number;
  total?: number;
}

export const parseLegacyShippingAddressFromNotes = (
  notes?: string | null,
): LegacyShippingAddress | null => {
  if (!notes || !notes.includes("SHIPPING_ADDRESS:")) {
    return null;
  }

  try {
    const jsonPart = notes.split("SHIPPING_ADDRESS:")[1]?.split("|")[0];
    if (!jsonPart) return null;
    return JSON.parse(jsonPart) as LegacyShippingAddress;
  } catch {
    return null;
  }
};

export const buildPersonName = (
  firstName?: string | null,
  lastName?: string | null,
) => `${firstName || ""} ${lastName || ""}`.trim();

export const parseLegacyPricingSummaryFromNotes = (
  notes?: string | null,
): LegacyPricingSummary | null => {
  if (!notes || !notes.includes("PRICING_SUMMARY:")) {
    return null;
  }

  try {
    const jsonPart = notes.split("PRICING_SUMMARY:")[1]?.split("|")[0];
    if (!jsonPart) return null;
    return JSON.parse(jsonPart) as LegacyPricingSummary;
  } catch {
    return null;
  }
};
