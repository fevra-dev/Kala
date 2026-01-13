import { CONSTANTS } from './constants';

/**
 * Logger Utility
 * 
 * Centralized logging system that can be disabled in production.
 * Prevents console logs from being detected by trackers.
 * 
 * SECURITY: All logs are conditional on DEBUG.ENABLED flag.
 * In production builds, webpack will remove these calls entirely.
 */
export class Logger {
  /**
   * Check if logging is enabled
   * Controlled by CONSTANTS.DEBUG.ENABLED
   */
  private static isEnabled(): boolean {
    return CONSTANTS.DEBUG.ENABLED;
  }
  
  /**
   * Log error messages
   * Always enabled (even in production) for critical errors
   * Filters out expected/benign errors to keep console clean
   * 
   * @param args - Arguments to log
   */
  static error(...args: any[]): void {
    // Filter out expected errors that don't need logging
    const errorMessage = args[0]?.toString() || '';
    const expectedErrors = [
      'Could not establish connection',
      'Receiving end does not exist',
      'Extension context invalidated',
      'Message port closed'
    ];
    
    // Skip logging expected errors (they're normal in extension lifecycle)
    if (expectedErrors.some(expected => errorMessage.includes(expected))) {
      // Only log in debug mode for development
      if (this.isEnabled()) {
        console.debug('[Kala] (Expected error, suppressed in production):', ...args);
      }
      return;
    }
    
    // Log actual errors with [Kala] prefix for easy filtering
    console.error('[Kala]', ...args);
  }
  
  /**
   * Log warning messages
   * Only enabled if DEBUG.ENABLED is true
   * 
   * @param args - Arguments to log
   */
  static warn(...args: any[]): void {
    if (this.isEnabled()) {
      console.warn('[Kala]', ...args);
    }
  }
  
  /**
   * Log informational messages
   * Only enabled if DEBUG.ENABLED is true
   * 
   * @param args - Arguments to log
   */
  static info(...args: any[]): void {
    if (this.isEnabled()) {
      console.info('[Kala]', ...args);
    }
  }
  
  /**
   * Log debug messages
   * Only enabled if DEBUG.ENABLED and DEBUG.LOG_KEYSTROKES are true
   * EFFICIENCY: Supports lazy evaluation to avoid string concatenation in production
   * 
   * @param args - Arguments to log (can include functions for lazy evaluation)
   */
  static debug(...args: any[]): void {
    if (this.isEnabled() && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
      // EFFICIENCY: Evaluate functions lazily
      const evaluatedArgs = args.map(arg => typeof arg === 'function' ? arg() : arg);
      console.debug('[Kala]', ...evaluatedArgs);
    }
  }
  
  /**
   * Log with custom level
   * Useful for conditional logging based on severity
   * 
   * @param level - Log level ('error' | 'warn' | 'info' | 'debug')
   * @param args - Arguments to log
   */
  static log(level: 'error' | 'warn' | 'info' | 'debug', ...args: any[]): void {
    switch (level) {
      case 'error':
        this.error(...args);
        break;
      case 'warn':
        this.warn(...args);
        break;
      case 'info':
        this.info(...args);
        break;
      case 'debug':
        this.debug(...args);
        break;
    }
  }
}

