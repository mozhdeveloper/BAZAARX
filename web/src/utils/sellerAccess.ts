export type SellerAccessTier = "guest" | "approved" | "unverified" | "blocked";

export type SellerApprovalStatus =
  | "pending"
  | "approved"
  | "verified"
  | "rejected"
  | "needs_resubmission"
  | "suspended"
  | "blacklisted";

export type SellerAccessContext = {
  isVerified?: boolean | null;
  approvalStatus?: string | null;
  storeName?: string | null;
};

const UNVERIFIED_ALLOWED_PATH_SET = new Set<string>([
  "/seller/profile",
  "/seller/store-profile",
  "/seller/notifications",
  "/seller/announcements",
  "/seller/help-center",
  "/seller/settings",
  "/seller/unverified",
]);

const DEFAULT_PATH_BY_TIER: Record<Exclude<SellerAccessTier, "guest">, string> = {
  approved: "/seller",
  unverified: "/seller/unverified",
  blocked: "/seller/account-blocked",
};

export const UNVERIFIED_ALLOWED_PATHS = [
  ...UNVERIFIED_ALLOWED_PATH_SET,
] as const;

export function normalizeSellerApprovalStatus(
  seller: SellerAccessContext | null | undefined
): SellerApprovalStatus {
  if (!seller) return "pending";

  const status = (seller.approvalStatus || "").toLowerCase();

  if (status === "approved") return "approved";
  if (status === "verified") return "verified";
  if (status === "rejected") return "rejected";
  if (status === "needs_resubmission") return "needs_resubmission";
  if (status === "suspended") return "suspended";
  if (status === "blacklisted") return "blacklisted";

  if (seller.isVerified) return "verified";

  return "pending";
}

export function isSellerApproved(
  seller: SellerAccessContext | null | undefined
): boolean {
  const status = normalizeSellerApprovalStatus(seller);
  if (status === "blacklisted" || status === "suspended") return false;
  return Boolean(seller?.isVerified) || status === "approved" || status === "verified";
}

export function getSellerAccessTier(
  seller: SellerAccessContext | null | undefined
): SellerAccessTier {
  if (!seller) return "guest";

  const status = normalizeSellerApprovalStatus(seller);

  if (status === "suspended" || status === "blacklisted") return "blocked";
  if (isSellerApproved(seller)) return "approved";
  return "unverified";
}

export function getDefaultPathForTier(tier: SellerAccessTier): string {
  if (tier === "guest") return "/seller/auth";
  return DEFAULT_PATH_BY_TIER[tier];
}

export function resolveSellerLandingPath(
  seller: SellerAccessContext | null | undefined
): string {
  // If seller is logged in but hasn't completed onboarding (empty storeName)
  if (seller && !seller.storeName) {
    return "/seller/onboarding";
  }
  return getDefaultPathForTier(getSellerAccessTier(seller));
}


export function isPathAllowedForTier(
  pathname: string,
  tier: SellerAccessTier
): boolean {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  if (tier === "approved") {
    return normalizedPath !== "/seller/unverified" && normalizedPath !== "/seller/account-blocked";
  }
  if (tier === "blocked") return normalizedPath === "/seller/account-blocked";
  if (tier === "unverified") return UNVERIFIED_ALLOWED_PATH_SET.has(normalizedPath);

  return false;
}
