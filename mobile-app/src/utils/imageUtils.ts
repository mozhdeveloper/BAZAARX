/**
 * Image utility helpers
 * Prevents React Native "source.uri should not be an empty string" warnings
 * and blocks social-media CDN URLs that cause cross-origin errors.
 */

/** Default placeholder for missing product images */
export const PLACEHOLDER_PRODUCT = 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image';

/** Default placeholder for missing avatar images */
export const PLACEHOLDER_AVATAR = 'https://placehold.co/100x100/e5e7eb/6b7280?text=User';

/** Default placeholder for missing banner images */
export const PLACEHOLDER_BANNER = 'https://placehold.co/600x200/f3f4f6/9ca3af?text=No+Banner';

/** Hostnames (or hostname suffixes) whose images are cross-origin blocked. */
const BLOCKED_DOMAINS: string[] = [
  'facebook.com',
  'fbcdn.net',     // Facebook CDN (scontent-*.fbcdn.net, etc.)
  'fbsbx.com',
  'instagram.com',
  'cdninstagram.com',
  'twimg.com',     // Twitter/X media
  'pbs.twimg.com',
];

/**
 * Returns a safe image URI — never returns empty string.
 * Falls back to placeholder if the input is falsy or belongs to a blocked CDN.
 */
export function safeImageUri(uri: string | undefined | null, placeholder = PLACEHOLDER_PRODUCT): string {
  // Check if uri is a non-empty string
  if (typeof uri === 'string' && uri.trim().length > 0) {
    // Block social-media CDN domains
    try {
      const { hostname } = new URL(uri);
      if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return placeholder;
      }
    } catch {
      // Relative URLs or invalid strings — pass through
    }
    return uri.trim();
  }
  return placeholder;
}
