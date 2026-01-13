/**
 * Advanced Timing Attack Protection
 * 
 * Protects against various high-resolution timing attack vectors:
 * 1. requestAnimationFrame timing
 * 2. setTimeout/setInterval precision
 * 3. Date.now() coarsening
 * 4. Event.timeStamp normalization
 * 5. AudioContext timing
 * 
 * Research shows these can leak microsecond-precision timing
 * that enables behavioral fingerprinting.
 * 
 * STRATEGY:
 * 1. Coarsen all timing sources to ~1ms precision
 * 2. Add consistent jitter across timing APIs
 * 3. Synchronize jitter to prevent cross-API correlation
 */

import { Logger } from '../shared/logger';

export class TimingAttackProtection {
  private enabled: boolean = true;
  private privacyLevel: 'low' | 'medium' | 'high' = 'medium';
  
  // Session-consistent jitter offset (prevents cross-request correlation)
  private sessionOffset: number;
  
  // Last frame timestamp for RAF protection
  private lastFrameTime: number = 0;
  private frameJitterAccumulator: number = 0;
  
  constructor() {
    // Generate session-consistent offset (changes per session, not per call)
    this.sessionOffset = Math.random() * 2; // 0-2ms offset
  }
  
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
  
  /**
   * Coarsen performance.now() result
   * Reduces precision from microseconds to ~1ms
   */
  coarsenPerformanceNow(timestamp: number): number {
    if (!this.enabled) return timestamp;
    
    const precision = this.getTimingPrecision();
    const jitter = this.getConsistentJitter();
    
    // Round to precision and add jitter
    return Math.round(timestamp / precision) * precision + jitter;
  }
  
  /**
   * Coarsen Date.now() result
   */
  coarsenDateNow(timestamp: number): number {
    if (!this.enabled) return timestamp;
    
    const precision = this.getTimingPrecision();
    
    // Round to precision
    return Math.round(timestamp / precision) * precision;
  }
  
  /**
   * Normalize event.timeStamp
   * Prevents high-precision event timing fingerprinting
   */
  normalizeEventTimestamp(timestamp: number): number {
    if (!this.enabled) return timestamp;
    
    const precision = this.getTimingPrecision();
    const jitter = this.getEventJitter();
    
    return Math.round(timestamp / precision) * precision + jitter;
  }
  
  /**
   * Get obfuscated requestAnimationFrame timestamp
   * Prevents RAF timing fingerprinting
   */
  obfuscateRAFTimestamp(timestamp: number): number {
    if (!this.enabled) return timestamp;
    
    const precision = this.getTimingPrecision();
    
    // Calculate expected frame interval (16.67ms for 60Hz)
    const expectedInterval = 16.67;
    
    if (this.lastFrameTime > 0) {
      const actualInterval = timestamp - this.lastFrameTime;
      const deviation = actualInterval - expectedInterval;
      
      // Smooth out frame timing deviations
      this.frameJitterAccumulator += deviation * 0.1;
      
      // Clamp accumulator
      if (Math.abs(this.frameJitterAccumulator) > 5) {
        this.frameJitterAccumulator = Math.sign(this.frameJitterAccumulator) * 5;
      }
    }
    
    this.lastFrameTime = timestamp;
    
    // Return coarsened timestamp with accumulated jitter correction
    return Math.round(timestamp / precision) * precision - this.frameJitterAccumulator;
  }
  
  /**
   * Get obfuscated AudioContext currentTime
   * Prevents audio timing fingerprinting
   */
  obfuscateAudioTime(currentTime: number): number {
    if (!this.enabled) return currentTime;
    
    // AudioContext uses seconds, coarsen to ~1ms (0.001s)
    const precision = 0.001;
    const jitter = this.sessionOffset / 1000; // Convert ms to seconds
    
    return Math.round(currentTime / precision) * precision + jitter;
  }
  
  /**
   * Get delay to add to setTimeout/setInterval
   * Makes timer precision less predictable
   */
  getTimerJitter(): number {
    if (!this.enabled) return 0;
    
    const maxJitter = {
      low: 1,
      medium: 2,
      high: 5
    }[this.privacyLevel];
    
    return Math.random() * maxJitter;
  }
  
  /**
   * Get timing precision based on privacy level
   */
  private getTimingPrecision(): number {
    return {
      low: 1,     // 1ms precision
      medium: 2,   // 2ms precision  
      high: 5      // 5ms precision
    }[this.privacyLevel];
  }
  
  /**
   * Get consistent jitter (same for duration of call, based on session)
   */
  private getConsistentJitter(): number {
    return this.sessionOffset;
  }
  
  /**
   * Get event-specific jitter
   */
  private getEventJitter(): number {
    const maxJitter = {
      low: 0.5,
      medium: 1,
      high: 2
    }[this.privacyLevel];
    
    // Add session offset + small random component
    return this.sessionOffset + (Math.random() - 0.5) * maxJitter;
  }
  
  /**
   * Regenerate session offset (call on session change)
   */
  regenerateSession(): void {
    this.sessionOffset = Math.random() * 2;
    this.frameJitterAccumulator = 0;
    this.lastFrameTime = 0;
    Logger.debug('Timing protection session regenerated');
  }
}
