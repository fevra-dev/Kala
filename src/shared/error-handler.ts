import { Logger } from './logger';
import { CONSTANTS } from './constants';
import { storage, tabs, runtime } from './browser-compat';

/**
 * Error Handler
 * 
 * Centralized error handling and recovery:
 * - Logs errors with context
 * - Attempts automatic recovery
 * - Reports critical errors
 * - Provides user-friendly error messages
 */
export class ErrorHandler {
  private static errorCount: number = 0;
  private static readonly MAX_ERRORS_BEFORE_DISABLE = 10;
  private static errorHistory: Array<{
    error: Error;
    context: string;
    timestamp: number;
  }> = [];
  
  /**
   * Handle error with context
   * 
   * @param error - Error object
   * @param context - Context where error occurred
   * @param recoverable - Whether error is recoverable
   */
  static handleError(
    error: Error | unknown,
    context: string,
    recoverable: boolean = true
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Increment error count
    this.errorCount++;
    
    // Log error
    Logger.error(`[${context}]`, errorObj);
    
    // Store in history
    this.errorHistory.push({
      error: errorObj,
      context,
      timestamp: Date.now(),
    });
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }
    
    // Check if we should disable protection
    if (this.errorCount >= this.MAX_ERRORS_BEFORE_DISABLE) {
      Logger.error('Too many errors, protection may be disabled');
      this.disableProtection();
    }
    
    // Attempt recovery if recoverable
    if (recoverable) {
      this.attemptRecovery(errorObj, context);
    }
  }
  
  /**
   * Attempt to recover from error
   */
  private static attemptRecovery(error: Error, context: string): void {
    // Recovery strategies based on context
    if (context.includes('storage')) {
      Logger.warn('Storage error detected, attempting recovery...');
      this.recoverStorage();
    } else if (context.includes('event')) {
      Logger.warn('Event handling error detected, clearing queue...');
      // Event queue recovery handled by EventQueue itself
    } else if (context.includes('messaging')) {
      Logger.warn('Messaging error detected, reinitializing...');
      // Messaging recovery handled by Messaging class
    }
  }
  
  /**
   * Recover from storage errors
   */
  private static async recoverStorage(): Promise<void> {
    try {
      // Clear potentially corrupted data
      await storage.local.clear();
      Logger.info('Storage cleared, reinitializing...');
      
      // Trigger reinitialization (would need to notify content script)
      runtime.sendMessage({
        type: 'STORAGE_RECOVERED',
      }).catch(() => {
        // Ignore if no listeners
      });
    } catch (error) {
      Logger.error('Storage recovery failed:', error);
    }
  }
  
  /**
   * Disable protection due to too many errors
   */
  private static disableProtection(): void {
    Logger.error('Disabling protection due to excessive errors');
    
    // Notify all tabs
    tabs.query({}).then((allTabs) => {
      allTabs.forEach((tab) => {
        if (tab.id) {
          tabs.sendMessage(tab.id, {
            type: 'DISABLE_PROTECTION',
            reason: 'too_many_errors',
          }).catch(() => {
            // Ignore errors
          });
        }
      });
    });
  }
  
  /**
   * Get error statistics
   */
  static getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    errorRate: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentErrors = this.errorHistory.filter(
      (e) => e.timestamp > oneHourAgo
    ).length;
    
    return {
      totalErrors: this.errorCount,
      recentErrors,
      errorRate: recentErrors / 60, // Errors per minute
    };
  }
  
  /**
   * Reset error count (for testing or manual reset)
   */
  static reset(): void {
    this.errorCount = 0;
    this.errorHistory = [];
    Logger.info('Error handler reset');
  }
  
  /**
   * Wrap async function with error handling
   * SECURITY: Sanitizes error messages to prevent information leakage
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(this.sanitizeError(error), context, true);
        throw error; // Re-throw for caller to handle
      }
    }) as T;
  }
  
  /**
   * Wrap sync function with error handling
   * SECURITY: Sanitizes error messages to prevent information leakage
   */
  static wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context: string
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(this.sanitizeError(error), context, true);
        throw error; // Re-throw for caller to handle
      }
    }) as T;
  }
  
  /**
   * Sanitize error to prevent information leakage
   * Removes stack traces and sensitive data in production
   */
  private static sanitizeError(error: Error | unknown): Error {
    if (error instanceof Error) {
      // In production, don't expose stack traces
      if (!CONSTANTS.DEBUG.ENABLED) {
        const sanitized = new Error(error.message);
        sanitized.name = error.name;
        return sanitized;
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}

