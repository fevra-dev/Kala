import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Web Worker Timing Protection
 * 
 * Prevents trackers from using Web Workers to measure timing independently.
 * Some trackers use Workers to bypass main-thread timing obfuscation.
 * 
 * SECURITY: Workers run in separate threads and can measure timing
 * independently. By adding noise to Worker.postMessage, we prevent
 * accurate timing measurements in workers.
 * 
 * TECHNIQUE: Intercept Worker.postMessage and add small random delays
 * to prevent precise timing analysis.
 */
export class WebWorkerTimingProtection {
  private static isProtected: boolean = false;
  private static originalPostMessage: typeof Worker.prototype.postMessage | null = null;
  
  /**
   * Initialize Web Worker timing protection
   * 
   * Overrides Worker.postMessage to add timing noise
   */
  static initialize(): void {
    if (this.isProtected) {
      return;
    }
    
    // Store original postMessage
    this.originalPostMessage = Worker.prototype.postMessage;
    
    // Override Worker.postMessage
    const originalPostMessage = this.originalPostMessage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Worker.prototype.postMessage = function(...args: any[]) {
      // Add small random delay to worker messages (0-2ms)
      // This prevents precise timing measurements in workers
      const delay = Math.random() * 2; // 0-2ms random delay
      
      setTimeout(() => {
        // Call original postMessage with original context
        if (originalPostMessage) {
          // TypeScript: postMessage accepts (message, options?) or (message, transfer)
          // We'll use the first argument as message, rest as options/transfer
          const message = args[0];
          const options = args.length > 1 ? args[1] : undefined;
          originalPostMessage.call(this, message, options);
        }
      }, delay);
    };
    
    this.isProtected = true;
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Web Worker timing protection initialized');
    }
  }
  
  /**
   * Restore original Worker.postMessage (for testing)
   */
  static restore(): void {
    if (!this.isProtected || !this.originalPostMessage) {
      return;
    }
    
    Worker.prototype.postMessage = this.originalPostMessage;
    this.isProtected = false;
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Web Worker timing protection restored');
    }
  }
  
  /**
   * Check if protection is active
   */
  static isActive(): boolean {
    return this.isProtected;
  }
}

