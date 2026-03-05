/**
 * Route prefetching utility.
 * Fires a dynamic import without rendering — just warms the module cache
 * so when the user actually navigates, the chunk is already downloaded.
 *
 * Usage:
 *   <Button onMouseEnter={() => prefetchRoute(() => import("../pages/CheckoutPage"))}>
 *     Proceed to Checkout
 *   </Button>
 */
export function prefetchRoute(factory: () => Promise<unknown>): void {
  void factory();
}
