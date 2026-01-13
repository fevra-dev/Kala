/**
 * Interaction Pattern Protection
 * 
 * Protects against behavioral fingerprinting via interaction patterns:
 * 1. Focus/blur patterns (tab switching behavior)
 * 2. Form field interaction (focus order, time per field)
 * 3. Copy/paste timing patterns
 * 4. Click patterns (single, double, long press)
 * 5. Hover dwell time (time before clicking)
 * 6. Visibility state changes
 * 
 * Research (BehavioCog, 2016) shows these patterns are
 * highly unique and can identify users with high accuracy.
 */

import { Logger } from '../shared/logger';

interface InteractionTiming {
  focusTime: number;
  blurTime: number;
  duration: number;
}

export class InteractionPatternProtection {
  private enabled: boolean = true;
  private privacyLevel: 'low' | 'medium' | 'high' = 'medium';
  
  // Tracking for pattern analysis
  private focusHistory: InteractionTiming[] = [];
  private lastFocusTime: number = 0;
  private lastBlurTime: number = 0;
  private hoverStartTime: number = 0;
  private clickCount: number = 0;
  private lastClickTime: number = 0;
  
  // Form field tracking
  private fieldFocusTimes: Map<string, number> = new Map();
  
  /**
   * Set privacy level
   */
  setPrivacyLevel(level: 'low' | 'medium' | 'high'): void {
    this.privacyLevel = level;
  }
  
  /**
   * Enable/disable protection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  // =========================================
  // FOCUS/BLUR PATTERN PROTECTION
  // =========================================
  
  /**
   * Get jitter for focus event timing
   * Prevents tab-switching pattern fingerprinting
   */
  getFocusJitter(): number {
    if (!this.enabled) return 0;
    
    const maxJitter = this.getMaxJitter();
    return Math.random() * maxJitter;
  }
  
  /**
   * Get jitter for blur event timing
   */
  getBlurJitter(): number {
    if (!this.enabled) return 0;
    
    const maxJitter = this.getMaxJitter();
    return Math.random() * maxJitter;
  }
  
  /**
   * Record focus event (for pattern analysis)
   */
  recordFocus(timestamp: number): void {
    this.lastFocusTime = timestamp;
    
    if (this.lastBlurTime > 0) {
      const awayDuration = timestamp - this.lastBlurTime;
      this.focusHistory.push({
        focusTime: timestamp,
        blurTime: this.lastBlurTime,
        duration: awayDuration
      });
      
      // Keep only recent history
      if (this.focusHistory.length > 20) {
        this.focusHistory.shift();
      }
    }
  }
  
  /**
   * Record blur event
   */
  recordBlur(timestamp: number): void {
    this.lastBlurTime = timestamp;
  }
  
  // =========================================
  // FORM FIELD INTERACTION PROTECTION
  // =========================================
  
  /**
   * Get delay for form field focus
   * Normalizes time between field switches
   */
  getFieldFocusDelay(fieldId: string): number {
    if (!this.enabled) return 0;
    
    // Track field focus time
    this.fieldFocusTimes.set(fieldId, performance.now());
    
    // Add jitter to field switching
    const baseDelay = 50; // Base 50ms
    const jitter = Math.random() * this.getMaxJitter();
    
    return baseDelay + jitter;
  }
  
  /**
   * Get obfuscated field dwell time
   * Time spent in a form field before moving to next
   */
  getObfuscatedFieldDwellTime(fieldId: string): number {
    const focusTime = this.fieldFocusTimes.get(fieldId);
    if (!focusTime) return 0;
    
    const actualDwell = performance.now() - focusTime;
    
    if (!this.enabled) return actualDwell;
    
    // Quantize to reduce precision
    const precision = this.getDwellPrecision();
    const jitter = (Math.random() - 0.5) * precision;
    
    return Math.round(actualDwell / precision) * precision + jitter;
  }
  
  // =========================================
  // COPY/PASTE PATTERN PROTECTION
  // =========================================
  
  /**
   * Get delay for copy event
   */
  getCopyDelay(): number {
    if (!this.enabled) return 0;
    
    // Add jitter to copy timing
    return Math.random() * this.getMaxJitter();
  }
  
  /**
   * Get delay for paste event
   */
  getPasteDelay(): number {
    if (!this.enabled) return 0;
    
    // Add jitter to paste timing
    return Math.random() * this.getMaxJitter();
  }
  
  // =========================================
  // CLICK PATTERN PROTECTION
  // =========================================
  
  /**
   * Get delay for click event
   * Normalizes click patterns
   */
  getClickDelay(): number {
    if (!this.enabled) return 0;
    
    const now = performance.now();
    const timeSinceLastClick = now - this.lastClickTime;
    
    // Detect potential double-click
    if (timeSinceLastClick < 400) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    
    this.lastClickTime = now;
    
    // Add jitter based on click type
    const baseJitter = this.getMaxJitter();
    
    if (this.clickCount > 1) {
      // Double-click: add more jitter to normalize interval
      return Math.random() * baseJitter * 2;
    }
    
    return Math.random() * baseJitter;
  }
  
  /**
   * Normalize double-click interval
   * Returns adjusted timestamp difference
   */
  normalizeDoubleClickInterval(): number {
    if (!this.enabled) return 0;
    
    // Normalize to ~250ms (typical double-click)
    const normalizedInterval = 230 + Math.random() * 40;
    return normalizedInterval;
  }
  
  // =========================================
  // HOVER DWELL TIME PROTECTION
  // =========================================
  
  /**
   * Record hover start
   */
  recordHoverStart(): void {
    this.hoverStartTime = performance.now();
  }
  
  /**
   * Get obfuscated hover dwell time before click
   */
  getObfuscatedHoverDwell(): number {
    if (this.hoverStartTime === 0) return 0;
    
    const actualDwell = performance.now() - this.hoverStartTime;
    
    if (!this.enabled) return actualDwell;
    
    // Quantize and add jitter
    const precision = this.getDwellPrecision();
    const jitter = (Math.random() - 0.5) * precision;
    
    this.hoverStartTime = 0; // Reset
    
    return Math.round(actualDwell / precision) * precision + jitter;
  }
  
  // =========================================
  // VISIBILITY STATE PROTECTION
  // =========================================
  
  /**
   * Get delay for visibility change event
   * Prevents page visibility fingerprinting
   */
  getVisibilityChangeDelay(): number {
    if (!this.enabled) return 0;
    
    return Math.random() * this.getMaxJitter();
  }
  
  // =========================================
  // HELPER METHODS
  // =========================================
  
  /**
   * Get maximum jitter based on privacy level
   */
  private getMaxJitter(): number {
    return {
      low: 20,
      medium: 50,
      high: 100
    }[this.privacyLevel];
  }
  
  /**
   * Get dwell time precision based on privacy level
   */
  private getDwellPrecision(): number {
    return {
      low: 50,
      medium: 100,
      high: 200
    }[this.privacyLevel];
  }
  
  /**
   * Reset all tracking state
   */
  reset(): void {
    this.focusHistory = [];
    this.lastFocusTime = 0;
    this.lastBlurTime = 0;
    this.hoverStartTime = 0;
    this.clickCount = 0;
    this.lastClickTime = 0;
    this.fieldFocusTimes.clear();
    Logger.debug('Interaction pattern protection reset');
  }
}
