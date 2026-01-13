import { Logger } from '../shared/logger';

/**
 * Performance API Coarsening
 * 
 * Reduces precision of performance.now() to prevent high-resolution timing attacks
 * Advanced trackers use performance.now() to measure keystroke timing with microsecond precision
 * 
 * SECURITY: This makes it harder for trackers to detect exact timing patterns
 */
export class PerformanceCoarsener {
  private static originalNow: () => number;
  private static isCoarsened: boolean = false;
  private static readonly COARSENING_PRECISION = 0.1; // 0.1ms precision (100 microseconds)
  
  /**
   * Coarsen performance.now() resolution
   * Reduces precision from nanoseconds to 0.1ms to prevent microsecond-level timing attacks
   */
  static initialize(): void {
    if (this.isCoarsened) {
      return;
    }
    
    // Store original function
    this.originalNow = performance.now;
    
    // Override with coarsened version
    const originalNow = this.originalNow;
    const precision = this.COARSENING_PRECISION;
    performance.now = function(): number {
      const preciseTime = originalNow.call(performance);
      // Round to 0.1ms precision (prevents microsecond-level analysis)
      return Math.floor(preciseTime / precision) * precision;
    };
    
    this.isCoarsened = true;
    Logger.info('Performance.now() coarsened to', this.COARSENING_PRECISION, 'ms precision');
  }
  
  /**
   * Restore original performance.now()
   * Useful for testing or if coarsening causes issues
   */
  static restore(): void {
    if (!this.isCoarsened || !this.originalNow) {
      return;
    }
    
    performance.now = this.originalNow;
    this.isCoarsened = false;
    Logger.info('Performance.now() restored to original precision');
  }
  
  /**
   * Check if coarsening is active
   */
  static isActive(): boolean {
    return this.isCoarsened;
  }
}

