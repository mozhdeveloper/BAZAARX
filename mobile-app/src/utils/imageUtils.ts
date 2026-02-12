/**
 * Image utility helpers
 * Prevents React Native "source.uri should not be an empty string" warnings
 */

/** Default placeholder for missing product images */
export const PLACEHOLDER_PRODUCT = 'https://placehold.co/200x200/f3f4f6/9ca3af?text=No+Image';

/** Default placeholder for missing avatar images */
export const PLACEHOLDER_AVATAR = 'https://placehold.co/100x100/e5e7eb/6b7280?text=User';

/** Default placeholder for missing banner images */
export const PLACEHOLDER_BANNER = 'https://placehold.co/600x200/f3f4f6/9ca3af?text=No+Banner';

/**
 * Returns a safe image URI — never returns empty string.
 * Falls back to placeholder if the input is falsy.
 */
export function safeImageUri(uri: string | undefined | null, placeholder = PLACEHOLDER_PRODUCT): string {
  // Check if uri is a non-empty string
  if (typeof uri === 'string' && uri.trim().length > 0) {
    return uri.trim();
  }
  return placeholder;
}
