/**
 * Shared date/time formatting helpers for chat screens.
 * Used by ChatScreen (buyer), StoreChatModal, and seller messages.
 */

/** Format a date key for daily chat separators — always full date, never "Today"/"Yesterday" */
export function formatDateLabel(dateKey: string): string {
  return new Date(dateKey).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format the detailed timestamp shown when a user taps a message bubble.
 * Example: "April 10, 2026, 10:30 PM"
 */
export function formatMessageTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
