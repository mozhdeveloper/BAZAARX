/**
 * Request Deduplication Utility
 * Prevents duplicate API calls by sharing pending promises for identical request keys.
 * 
 * Usage:
 *   const data = await fetchWithDedup('products:all', () => api.getProducts());
 *   // If called again while the first request is pending, returns the same promise.
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Executes a fetch function with deduplication.
 * If an identical request (by key) is already in-flight, returns the existing promise
 * instead of firing a duplicate network call.
 */
export async function fetchWithDedup<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Cancel/remove a pending dedup entry (e.g. on unmount).
 */
export function cancelDedup(key: string): void {
  pendingRequests.delete(key);
}

/**
 * Check how many requests are currently in-flight.
 */
export function pendingCount(): number {
  return pendingRequests.size;
}
