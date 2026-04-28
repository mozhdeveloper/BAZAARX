/**
 * Quick Reply Cooldown — localStorage-based 5-minute cooldown per reply chip.
 * Persists across page refreshes and conversation re-entry.
 */

const STORAGE_KEY = 'bazaarx_qr_cooldowns';
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface CooldownEntry {
  key: string;
  expiresAt: number;
}

function getEntries(): CooldownEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: CooldownEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function makeKey(conversationId: string, replyText: string): string {
  return `${conversationId}::${replyText}`;
}

/** Remove all expired entries from localStorage. */
export function cleanExpired(): void {
  const now = Date.now();
  saveEntries(getEntries().filter((e) => e.expiresAt > now));
}

/** Mark a quick reply as used — starts the 5-min cooldown. */
export function setCooldown(conversationId: string, replyText: string): void {
  cleanExpired();
  const key = makeKey(conversationId, replyText);
  const entries = getEntries().filter((e) => e.key !== key);
  entries.push({ key, expiresAt: Date.now() + COOLDOWN_MS });
  saveEntries(entries);
}

/** Check if a quick reply is still on cooldown. */
export function isOnCooldown(conversationId: string, replyText: string): boolean {
  const key = makeKey(conversationId, replyText);
  const entry = getEntries().find((e) => e.key === key);
  if (!entry) return false;
  return entry.expiresAt > Date.now();
}

/** Return only the replies that are NOT on cooldown. */
export function getAvailableReplies(conversationId: string, allReplies: string[]): string[] {
  cleanExpired();
  return allReplies.filter((r) => !isOnCooldown(conversationId, r));
}

/** Get the remaining cooldown time in ms for a specific reply (0 if not on cooldown). */
export function getRemainingCooldown(conversationId: string, replyText: string): number {
  const key = makeKey(conversationId, replyText);
  const entry = getEntries().find((e) => e.key === key);
  if (!entry) return 0;
  return Math.max(0, entry.expiresAt - Date.now());
}
