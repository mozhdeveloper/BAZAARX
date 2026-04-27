/**
 * Messaging Account Status — ported from mobile-app/src/utils/messagingAccountStatus.ts
 * Centralized seller messaging eligibility mapping for web.
 */

export type MessagingAccountStatus = 'active' | 'suspended' | 'restricted';

export interface SellerMessagingStatusFields {
  approval_status?: string | null;
  is_permanently_blacklisted?: boolean | null;
  blacklisted_at?: string | null;
  temp_blacklist_until?: string | null;
  cool_down_until?: string | null;
  suspended_at?: string | null;
}

const SUSPENDED_APPROVAL_STATES = new Set(['blacklisted', 'suspended', 'banned']);
const RESTRICTED_APPROVAL_STATES = new Set(['needs_resubmission', 'rejected', 'restricted']);

function normalizeApprovalStatus(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isFutureTimestamp(value?: string | null, nowMs: number = Date.now()): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed > nowMs;
}

/**
 * Centralized seller messaging eligibility mapping.
 * Priority: suspended > restricted > active.
 */
export function resolveSellerMessagingAccountStatus(
  seller: SellerMessagingStatusFields,
  nowMs: number = Date.now()
): MessagingAccountStatus {
  const approvalStatus = normalizeApprovalStatus(seller.approval_status);
  const hasSuspendedKeyword = approvalStatus.includes('suspend') || approvalStatus.includes('blacklist') || approvalStatus.includes('ban');

  const isSuspended =
    seller.is_permanently_blacklisted === true ||
    !!seller.blacklisted_at ||
    !!seller.suspended_at ||
    SUSPENDED_APPROVAL_STATES.has(approvalStatus) ||
    hasSuspendedKeyword;

  if (isSuspended) return 'suspended';

  const isRestricted =
    isFutureTimestamp(seller.temp_blacklist_until, nowMs) ||
    isFutureTimestamp(seller.cool_down_until, nowMs) ||
    RESTRICTED_APPROVAL_STATES.has(approvalStatus);

  if (isRestricted) return 'restricted';

  return 'active';
}

export function isMessagingBlocked(status: MessagingAccountStatus): boolean {
  return status !== 'active';
}
