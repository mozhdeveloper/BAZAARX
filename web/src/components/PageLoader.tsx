/**
 * PageLoader — Displayed as a fallback while lazy-loaded route chunks are fetched.
 * Keeps the BAZAAR brand colors and provides a smooth loading experience.
 */
export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFBF0]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated brand spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-amber-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-amber-600" />
        </div>
        <span className="text-sm font-medium tracking-wide text-amber-800/70">
          Loading…
        </span>
      </div>
    </div>
  );
}
