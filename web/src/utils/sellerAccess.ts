export type SellerAccessTier = "guest" | "approved" | "unverified" | "blocked";

export type SellerApprovalStatus =
  | "pending"
  | "approved"
  | "verified"
  | "rejected"
  | "needs_resubmission"
  | "suspended";

type SellerAccessContext = {
  isVerified?: boolean | null;
  approvalStatus?: string | null;
  storeName?: string | null;
};

const UNVERIFIED_ALLOWED_PATH_SET = new Set<string>([
  "/seller",
  "/seller/profile",
  "/seller/store-profile",
  "/seller/notifications",
  "/seller/help-center",
  "/seller/settings",
  "/seller/unverified",
]);

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

  if (seller.isVerified) return "verified";

  return "pending";
}

export function isSellerApproved(
  seller: SellerAccessContext | null | undefined
): boolean {
  const status = normalizeSellerApprovalStatus(seller);
  return Boolean(seller?.isVerified) || status === "approved" || status === "verified";
}

export function getSellerAccessTier(
  seller: SellerAccessContext | null | undefined
): SellerAccessTier {
  if (!seller) return "guest";

  const status = normalizeSellerApprovalStatus(seller);

  if (status === "suspended") return "blocked";
  if (isSellerApproved(seller)) return "approved";
  return "unverified";
}

export function isPathAllowedForTier(
  pathname: string,
  tier: SellerAccessTier
): boolean {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  if (tier === "approved") return true;
  if (tier === "blocked") return normalizedPath === "/seller/account-blocked";
  if (tier === "unverified") return UNVERIFIED_ALLOWED_PATH_SET.has(normalizedPath);

  return false;
}
