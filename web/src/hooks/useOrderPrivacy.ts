/**
 * useOrderPrivacy
 * ───────────────
 * Central hook for registry order privacy rules.
 * Determines what address / contact data each viewer role may see.
 *
 * Privacy Matrix (Registry Orders)
 * ─────────────────────────────────────────────────────────
 * Field            │ Seller (ships it)  │ Gifter (bought it)
 * ─────────────────┼────────────────────┼───────────────────
 * Recipient name   │ ✅ full            │ ✅ full
 * Street address   │ ✅ full            │ 🔒 hidden
 * City / Province  │ ✅ full            │ 🔒 masked (***)
 * Postal code      │ ✅ full            │ 🔒 masked (****)
 * Phone number     │ 🔒 last-4 only     │ 🔒 fully hidden
 * Email            │ 🔒 hidden          │ 🔒 hidden
 * ─────────────────────────────────────────────────────────
 *
 * Usage:
 *   const privacy = useOrderPrivacy({ order, viewerRole });
 *   privacy.recipientName     → "Bea Alexa"
 *   privacy.street            → "123 Rizal St." | "Registry Gift — Address Protected"
 *   privacy.maskedPhone       → "***7215"
 *   privacy.isRegistryOrder   → true
 *   privacy.showAddressAlert  → true (show shield banner)
 */

export type OrderViewerRole = "seller" | "buyer" | "admin";

export interface RegistryAddressVisibility {
  /** Name to display in customer/recipient column */
  recipientName: string;
  /** Whether to display the full name (recipient) or gifter */
  displayNameSource: "recipient" | "gifter";
  /** Full street address (sellers) or hidden placeholder (gifters) */
  street: string;
  /** City — full for sellers, *** for gifters */
  city: string;
  /** Province — full for sellers, *** for gifters */
  province: string;
  /** Postal code — full for sellers, **** for gifters */
  postalCode: string;
  /** Phone — last-4 masked for sellers, fully hidden for gifters */
  maskedPhone: string;
  /** Whether to render the registry privacy alert banner */
  showAddressAlert: boolean;
  /** Whether to show a shield icon + "Address Protected" pill */
  showPhoneAlert: boolean;
  /** True when this is a registry gift order */
  isRegistryOrder: boolean;
  /** Role of the current viewer */
  viewerRole: OrderViewerRole;
}

interface UseOrderPrivacyInput {
  /** The shipping address as resolved by the mapper */
  shippingAddress?: {
    fullName?: string;
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
  } | null;
  /** The recipient name saved in order_recipients */
  recipientName?: string;
  /** Whether this is a registry gift order */
  isRegistryOrder?: boolean;
  /** The role of the authenticated user viewing this order */
  viewerRole: OrderViewerRole;
}

/** Mask all but the last N characters of a string */
function maskAll(value: string): string {
  if (!value) return "—";
  return "*".repeat(value.length);
}

/** Show only the last 4 digits of a phone number, mask the rest */
function maskPhoneLast4(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 4) return "****";
  return "*".repeat(clean.length - 4) + clean.slice(-4);
}

export function useOrderPrivacy({
  shippingAddress,
  recipientName,
  isRegistryOrder = false,
  viewerRole,
}: UseOrderPrivacyInput): RegistryAddressVisibility {
  const addr = shippingAddress ?? {};
  const rawPhone = addr.phone ?? "";

  // Non-registry orders: no masking at all
  if (!isRegistryOrder) {
    return {
      recipientName: recipientName || addr.fullName || "Customer",
      displayNameSource: "recipient",
      street: addr.street ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postalCode: addr.postalCode ?? "",
      maskedPhone: rawPhone,
      showAddressAlert: false,
      showPhoneAlert: false,
      isRegistryOrder: false,
      viewerRole,
    };
  }

  // ─── REGISTRY ORDER ────────────────────────────────────────
  // Admin: full access
  if (viewerRole === "admin") {
    return {
      recipientName: recipientName || addr.fullName || "Registry Recipient",
      displayNameSource: "recipient",
      street: addr.street ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postalCode: addr.postalCode ?? "",
      maskedPhone: rawPhone,
      showAddressAlert: false,
      showPhoneAlert: false,
      isRegistryOrder: true,
      viewerRole,
    };
  }

  // Seller: sees full address, phone masked to last 4
  if (viewerRole === "seller") {
    return {
      recipientName: recipientName || addr.fullName || "Registry Recipient",
      displayNameSource: "recipient",
      street: addr.street || "Registry Gift — Address Protected",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postalCode: addr.postalCode ?? "",
      maskedPhone: rawPhone ? maskPhoneLast4(rawPhone) : "—",
      showAddressAlert: false,
      showPhoneAlert: true,
      isRegistryOrder: true,
      viewerRole,
    };
  }

  // Gifter/Buyer: fully masked
  return {
    recipientName: recipientName || addr.fullName || "Registry Recipient",
    displayNameSource: "recipient",
    street: "Registry Gift — Address Protected",
    city: "***",
    province: "***",
    postalCode: "****",
    maskedPhone: "—",
    showAddressAlert: true,
    showPhoneAlert: true,
    isRegistryOrder: true,
    viewerRole,
  };
}

/** Standalone helper — use outside React (e.g. in mappers or email services) */
export function getRecipientDisplayName(
  recipientFirstName?: string | null,
  recipientLastName?: string | null,
  gifterName?: string | null,
): string {
  const fromRecipient = [recipientFirstName, recipientLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fromRecipient || gifterName || "Customer";
}

/** Phone masking utils — exported for use in the mapper layer */
export { maskPhoneLast4, maskAll };
