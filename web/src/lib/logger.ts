/**
 * Environment-gated logger
 * In production builds (import.meta.env.PROD), all console output is suppressed.
 * In development, logging works normally.
 *
 * Usage: import '@/lib/logger' in main.tsx (side-effect only)
 */

const isProduction = import.meta.env.PROD;

if (isProduction) {
  const noop = () => {};
  // Preserve console.error for critical runtime errors that should be monitored
  // but suppress informational logging that could leak internal details
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
  // console.error is intentionally kept for production error monitoring
}
