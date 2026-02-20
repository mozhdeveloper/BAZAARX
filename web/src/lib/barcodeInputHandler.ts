/**
 * Barcode Input Handler
 * Captures keyboard input from USB barcode scanners
 * 
 * USB barcode scanners act as keyboard devices, rapidly typing characters
 * This handler detects rapid sequential input vs normal typing
 */

export interface BarcodeInputConfig {
  /** Time to wait after last keystroke before triggering (ms) */
  timeoutMs: number;
  /** Minimum barcode length */
  minLength: number;
  /** Maximum barcode length */
  maxLength: number;
  /** Optional prefix that scanner adds */
  prefix: string;
  /** Optional suffix that scanner adds */
  suffix: string;
  /** Enable debug logging */
  debug: boolean;
  /** HTML tags to ignore when scanning */
  ignoredTags: string[];
  /** CSS class that allows scanning even in inputs */
  allowedInputClass: string;
  /** Maximum time between keystrokes to consider as scanner input (ms) */
  maxKeystrokeGap: number;
}

export type BarcodeCallback = (barcode: string) => void;

const DEFAULT_CONFIG: BarcodeInputConfig = {
  timeoutMs: 100,
  minLength: 4,
  maxLength: 50,
  prefix: '',
  suffix: '',
  debug: false,
  ignoredTags: ['INPUT', 'TEXTAREA', 'SELECT'],
  allowedInputClass: 'barcode-input',
  maxKeystrokeGap: 200,
};

export class BarcodeInputHandler {
  private config: BarcodeInputConfig;
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callback: BarcodeCallback | null = null;
  private isActive: boolean = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: Partial<BarcodeInputConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start listening for barcode scans
   */
  start(callback: BarcodeCallback): void {
    if (this.isActive) {
      this.log('Handler already active');
      return;
    }

    this.callback = callback;
    this.isActive = true;

    this.keydownHandler = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.keydownHandler);

    this.log('Barcode scanner handler started');
  }

  /**
   * Stop listening for barcode scans
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.callback = null;
    this.clearBuffer();

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.log('Barcode scanner handler stopped');
  }

  /**
   * Pause scanning temporarily (e.g., when dialog opens)
   */
  pause(): void {
    this.isActive = false;
    this.clearBuffer();
    this.log('Barcode scanner paused');
  }

  /**
   * Resume scanning
   */
  resume(): void {
    if (this.keydownHandler) {
      this.isActive = true;
      this.log('Barcode scanner resumed');
    }
  }

  /**
   * Check if handler is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current buffer contents
   */
  getBuffer(): string {
    return this.buffer;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // Check if we should ignore this input
    if (this.shouldIgnoreEvent(event)) {
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - this.lastKeyTime;

    // If too much time has passed, this is likely manual typing - reset buffer
    if (this.lastKeyTime > 0 && timeSinceLastKey > this.config.maxKeystrokeGap) {
      this.log(`Gap too large (${timeSinceLastKey}ms), resetting buffer`);
      this.clearBuffer();
    }

    this.lastKeyTime = now;

    // Handle Enter key - attempt to process barcode
    if (event.key === 'Enter') {
      event.preventDefault();
      this.processBuffer();
      return;
    }

    // Handle Escape - clear buffer
    if (event.key === 'Escape') {
      this.clearBuffer();
      return;
    }

    // Only accept printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.buffer += event.key;
      this.log(`Buffer: "${this.buffer}"`);

      // Prevent character from appearing in focused input
      if (this.buffer.length > 1) {
        event.preventDefault();
      }

      // Reset timeout
      this.resetTimeout();
    }
  }

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;

    // Always allow if target has the allowed class
    if (target.classList?.contains(this.config.allowedInputClass)) {
      return false;
    }

    // Ignore if focused on input elements
    if (this.config.ignoredTags.includes(target.tagName)) {
      // But only if buffer is empty (allow scanner to complete a scan)
      if (this.buffer.length === 0) {
        return true;
      }
    }

    return false;
  }

  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.processBuffer();
    }, this.config.timeoutMs);
  }

  private processBuffer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    let barcode = this.buffer.trim();

    // Remove prefix/suffix if configured
    if (this.config.prefix && barcode.startsWith(this.config.prefix)) {
      barcode = barcode.slice(this.config.prefix.length);
    }
    if (this.config.suffix && barcode.endsWith(this.config.suffix)) {
      barcode = barcode.slice(0, -this.config.suffix.length);
    }

    // Validate length
    if (barcode.length < this.config.minLength) {
      this.log(`Barcode too short: "${barcode}" (min: ${this.config.minLength})`);
      this.clearBuffer();
      return;
    }

    if (barcode.length > this.config.maxLength) {
      this.log(`Barcode too long: "${barcode}" (max: ${this.config.maxLength})`);
      this.clearBuffer();
      return;
    }

    this.log(`Valid barcode detected: "${barcode}"`);

    // Trigger callback
    if (this.callback) {
      this.callback(barcode);
    }

    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.buffer = '';
    this.lastKeyTime = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[BarcodeHandler] ${message}`);
    }
  }
}

/**
 * Create a singleton instance for global use
 */
let globalHandler: BarcodeInputHandler | null = null;

export function getGlobalBarcodeHandler(config?: Partial<BarcodeInputConfig>): BarcodeInputHandler {
  if (!globalHandler) {
    globalHandler = new BarcodeInputHandler(config);
  }
  return globalHandler;
}

export function destroyGlobalBarcodeHandler(): void {
  if (globalHandler) {
    globalHandler.stop();
    globalHandler = null;
  }
}
