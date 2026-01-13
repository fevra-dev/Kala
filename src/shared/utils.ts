import { Logger } from './logger';

/**
 * Shared utility functions used across extension components
 */
export class Utils {
  /**
   * Extract hostname from current page URL
   * Used for per-site settings keys
   * SECURITY: Validates URL format to prevent errors
   */
  static getCurrentDomain(): string {
    try {
      // SECURITY: Validate location object
      if (!window.location || !window.location.hostname) {
        Logger.warn('Invalid location object');
        return 'unknown';
      }
      
      const hostname = window.location.hostname;
      
      // SECURITY: Validate hostname length (prevent DoS)
      if (hostname.length > 253) { // Max domain name length per RFC
        Logger.warn('Hostname too long');
        return 'unknown';
      }
      
      return hostname;
    } catch (error) {
      Logger.error('Failed to get domain:', error);
      return 'unknown';
    }
  }
  
  /**
   * Safely extract domain from URL string
   * SECURITY: Validates URL format before processing
   */
  static safeGetDomain(url: string): string | null {
    try {
      if (!url || typeof url !== 'string' || url.length > 2048) { // Max URL length
        return null;
      }
      
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      Logger.error('Invalid URL format:', error);
      return null;
    }
  }
  
  /**
   * Generate unique identifier for tracking
   * Format: timestamp-randomString
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Promise-based sleep for async operations
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Constrain value within min/max bounds
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
  
  /**
   * Generate random number in range [min, max)
   */
  static getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}

