import { Logger } from './logger';
import { CONSTANTS } from './constants';

/**
 * Performance Monitor
 * 
 * Tracks and monitors extension performance:
 * - Event processing times
 * - Memory usage
 * - CPU usage estimates
 * - Performance alerts
 */
export class PerformanceMonitor {
  private static eventTimings: Array<{
    type: string;
    duration: number;
    timestamp: number;
  }> = [];
  
  private static readonly MAX_TIMINGS = 1000;
  private static readonly PERFORMANCE_THRESHOLD_MS = CONSTANTS.PERFORMANCE.MAX_EVENT_OVERHEAD_MS * 2;
  private static alertCount: number = 0;
  
  /**
   * Track event processing time
   * 
   * @param eventType - Type of event (keystroke, mouse, scroll)
   * @param duration - Processing duration in milliseconds
   */
  static trackEvent(eventType: string, duration: number): void {
    this.eventTimings.push({
      type: eventType,
      duration,
      timestamp: Date.now(),
    });
    
    // Keep only recent timings
    if (this.eventTimings.length > this.MAX_TIMINGS) {
      this.eventTimings.shift();
    }
    
    // Check for performance issues
    if (duration > this.PERFORMANCE_THRESHOLD_MS) {
      this.handlePerformanceAlert(eventType, duration);
    }
  }
  
  /**
   * Handle performance alert
   */
  private static handlePerformanceAlert(eventType: string, duration: number): void {
    this.alertCount++;
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.warn(
        `Performance alert: ${eventType} event took ${duration.toFixed(2)}ms ` +
        `(threshold: ${this.PERFORMANCE_THRESHOLD_MS}ms)`
      );
    }
    
    // If too many alerts, log warning
    if (this.alertCount > 10) {
      Logger.warn('Multiple performance alerts detected. Extension may be under heavy load.');
      this.alertCount = 0; // Reset counter
    }
  }
  
  /**
   * Get performance statistics
   */
  static getStats(): {
    averageProcessingTime: number;
    maxProcessingTime: number;
    minProcessingTime: number;
    eventsPerSecond: number;
    performanceAlerts: number;
  } {
    if (this.eventTimings.length === 0) {
      return {
        averageProcessingTime: 0,
        maxProcessingTime: 0,
        minProcessingTime: 0,
        eventsPerSecond: 0,
        performanceAlerts: this.alertCount,
      };
    }
    
    const durations = this.eventTimings.map((t) => t.duration);
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    // Calculate events per second (last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentEvents = this.eventTimings.filter(
      (t) => t.timestamp > oneMinuteAgo
    ).length;
    const eventsPerSecond = recentEvents / 60;
    
    return {
      averageProcessingTime: average,
      maxProcessingTime: max,
      minProcessingTime: min,
      eventsPerSecond,
      performanceAlerts: this.alertCount,
    };
  }
  
  /**
   * Get performance breakdown by event type
   */
  static getBreakdown(): Record<string, {
    count: number;
    average: number;
    max: number;
  }> {
    const breakdown: Record<string, {
      count: number;
      total: number;
      max: number;
    }> = {};
    
    this.eventTimings.forEach((timing) => {
      if (!breakdown[timing.type]) {
        breakdown[timing.type] = {
          count: 0,
          total: 0,
          max: 0,
        };
      }
      
      breakdown[timing.type].count++;
      breakdown[timing.type].total += timing.duration;
      breakdown[timing.type].max = Math.max(
        breakdown[timing.type].max,
        timing.duration
      );
    });
    
    // Convert to averages
    const result: Record<string, { count: number; average: number; max: number }> = {};
    Object.keys(breakdown).forEach((type) => {
      result[type] = {
        count: breakdown[type].count,
        average: breakdown[type].total / breakdown[type].count,
        max: breakdown[type].max,
      };
    });
    
    return result;
  }
  
  /**
   * Check if performance is acceptable
   */
  static isPerformanceAcceptable(): boolean {
    const stats = this.getStats();
    return (
      stats.averageProcessingTime <= CONSTANTS.PERFORMANCE.MAX_EVENT_OVERHEAD_MS &&
      stats.performanceAlerts < 5
    );
  }
  
  /**
   * Reset performance monitoring
   */
  static reset(): void {
    this.eventTimings = [];
    this.alertCount = 0;
    Logger.info('Performance monitor reset');
  }
  
  /**
   * Get memory usage estimate (if available)
   */
  static getMemoryUsage(): number | null {
    // Chrome extensions don't have direct memory API
    // This is a placeholder for future implementation
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }
}

