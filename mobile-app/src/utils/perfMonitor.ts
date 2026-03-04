/**
 * Performance Monitoring Utility
 * Lightweight, zero-cost in production. Tracks render times, API calls, and custom marks.
 *
 * Usage:
 *   perfMonitor.start('HomeScreen.loadProducts');
 *   await loadProducts();
 *   perfMonitor.end('HomeScreen.loadProducts');
 *
 *   // Or use the measure helper:
 *   const data = await perfMonitor.measure('fetchOrders', () => orderService.getOrders());
 */

const IS_DEV = __DEV__;

interface PerfEntry {
  label: string;
  duration: number;
  timestamp: number;
}

class PerfMonitor {
  private marks = new Map<string, number>();
  private history: PerfEntry[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Start a named timing mark.
   */
  start(label: string): void {
    if (!IS_DEV) return;
    this.marks.set(label, performance.now());
  }

  /**
   * End a named timing mark and log the duration.
   * Returns the duration in ms, or -1 if the mark was not found.
   */
  end(label: string): number {
    if (!IS_DEV) return -1;

    const startTime = this.marks.get(label);
    if (startTime === undefined) {
      console.warn(`[PerfMonitor] No start mark found for "${label}"`);
      return -1;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    // Store in history
    const entry: PerfEntry = { label, duration, timestamp: Date.now() };
    this.history.push(entry);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Log with color coding
    if (duration > 500) {
      console.warn(`[PerfMonitor] ⚠️ SLOW: ${label} took ${duration.toFixed(1)}ms`);
    } else if (duration > 200) {
      console.log(`[PerfMonitor] 🟡 ${label}: ${duration.toFixed(1)}ms`);
    } else {
      console.log(`[PerfMonitor] ✅ ${label}: ${duration.toFixed(1)}ms`);
    }

    return duration;
  }

  /**
   * Measure an async operation and return its result.
   * Automatically starts/ends the timer around the function call.
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Measure a synchronous operation and return its result.
   */
  measureSync<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Get the performance history (most recent entries).
   */
  getHistory(): PerfEntry[] {
    return [...this.history];
  }

  /**
   * Get a summary of average durations per label.
   */
  getSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const groups: Record<string, number[]> = {};
    this.history.forEach(entry => {
      if (!groups[entry.label]) groups[entry.label] = [];
      groups[entry.label].push(entry.duration);
    });

    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    Object.entries(groups).forEach(([label, durations]) => {
      summary[label] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length,
      };
    });
    return summary;
  }

  /**
   * Clear all marks and history.
   */
  clear(): void {
    this.marks.clear();
    this.history = [];
  }
}

export const perfMonitor = new PerfMonitor();
