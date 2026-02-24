/**
 * Image utilities — sanitize URLs and provide fallback behaviour for <img> tags.
 *
 * Some product images may reference social-media CDN hosts (Facebook, Instagram, etc.)
 * that block cross-origin loading and emit net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
 * in the browser console.  Replace those at render time rather than at data-entry time
 * so we never corrupt what's stored in the DB.
 */

import type { SyntheticEvent } from 'react';

export const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400?text=No+Image';

/** Hostnames (or hostname suffixes) whose images are cross-origin blocked. */
const BLOCKED_DOMAINS: string[] = [
  'facebook.com',
  'fbcdn.net',   // Facebook CDN (scontent-*.fbcdn.net, etc.)
  'fbsbx.com',
  'instagram.com',
  'cdninstagram.com',
  'twimg.com',   // Twitter/X media
  'pbs.twimg.com',
];

/**
 * Returns a safe image URL.
 * - Returns `fallback` if `url` is empty/null.
 * - Returns `fallback` if the URL's hostname belongs to a blocked social-media CDN.
 * - Returns the original URL otherwise.
 */
export function getSafeImageUrl(
  url: string | null | undefined,
  fallback: string = PLACEHOLDER_IMAGE
): string {
  if (!url) return fallback;
  try {
    const { hostname } = new URL(url);
    if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      return fallback;
    }
  } catch {
    // Relative URLs or invalid strings — pass through unchanged
  }
  return url;
}

/**
 * Drop-in `onError` handler for <img> elements.
 * Replaces the broken src with the placeholder and clears itself to prevent
 * infinite error loops (the placeholder should never fail).
 *
 * Usage:  <img src={url} onError={handleImageError} />
 */
export function handleImageError(
  e: SyntheticEvent<HTMLImageElement>,
  fallback: string = PLACEHOLDER_IMAGE
): void {
  const el = e.currentTarget;
  if (el.src !== fallback) {
    el.src = fallback;
  }
  el.onerror = null; // prevent infinite loop if placeholder also fails
}
