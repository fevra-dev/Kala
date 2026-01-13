import { PrivacyLevel } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Scroll Pattern Obfuscator
 * 
 * Obfuscates scroll patterns to prevent behavioral fingerprinting.
 * Trackers analyze:
 * - Scroll velocity curves
 * - Acceleration patterns
 * - Pause durations
 * - Reading patterns (slow scroll = reading)
 * - Scroll direction changes
 * - Scroll distance and timing
 * 
 * STRATEGY:
 * 1. Add timing noise to scroll events (±10ms)
 * 2. Vary scroll velocity by ±15%
 * 3. Introduce natural pauses (3% probability, 50ms)
 * 4. Vary acceleration patterns
 * 5. Context-aware (reading mode detection)
 */
export class ScrollObfuscator {
  private privacyLevel: PrivacyLevel = 'medium';
  private lastScrollPosition: { x: number; y: number } | null = null;
  private lastScrollTimestamp: number = 0;
  private velocityHistory: number[] = [];
  private readonly MAX_VELOCITY_HISTORY = 10;
  private isReadingMode: boolean = false;
  private readingModeStartTime: number = 0;
  
  /**
   * Set privacy level (affects noise magnitude)
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.privacyLevel = level;
  }
  
  /**
   * Get reading mode status (for context detection)
   */
  getReadingMode(): boolean {
    return this.isReadingMode;
  }
  
  /**
   * Obfuscate scroll event timing and velocity
   * 
   * @param event - Original scroll event
   * @param scrollDelta - Scroll delta (positive = down/right, negative = up/left)
   * @returns Obfuscated scroll delay and velocity multiplier
   */
  obfuscateScrollEvent(
    event: Event,
    scrollDelta: { x: number; y: number }
  ): { delay: number; velocityMultiplier: number } {
    if (!CONSTANTS.SCROLL.ENABLED) {
      return { delay: 0, velocityMultiplier: 1.0 };
    }
    
    const now = performance.now();
    const timeDelta = now - this.lastScrollTimestamp;
    
    // Calculate current scroll velocity
    let velocity = 0;
    if (this.lastScrollPosition && timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(scrollDelta.x, 2) + Math.pow(scrollDelta.y, 2)
      );
      velocity = distance / timeDelta; // pixels per millisecond
      
      // Track velocity history for pattern detection
      this.velocityHistory.push(velocity);
      if (this.velocityHistory.length > this.MAX_VELOCITY_HISTORY) {
        this.velocityHistory.shift();
      }
    }
    
    // Detect reading mode (slow, consistent scrolling)
    this.detectReadingMode(velocity, timeDelta);
    
    // Calculate timing noise based on privacy level
    const timingNoise = this.getTimingNoise();
    
    // Calculate velocity noise multiplier
    const velocityMultiplier = this.getVelocityMultiplier(velocity);
    
    // Check for natural pause
    let delay = 0;
    if (this.shouldAddPause()) {
      delay = this.getPauseDuration();
    } else {
      // Add small timing noise even without pause
      delay = timingNoise;
    }
    
    // Update tracking state
    this.lastScrollTimestamp = now;
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Scroll obfuscation:', {
        velocity: velocity.toFixed(2),
        delay: delay.toFixed(2),
        velocityMultiplier: velocityMultiplier.toFixed(3),
        readingMode: this.isReadingMode,
        timingNoise: timingNoise.toFixed(2)
      });
    }
    
    return { delay, velocityMultiplier };
  }
  
  /**
   * Detect reading mode (slow, consistent scrolling)
   * Reading patterns are characterized by:
   * - Slow velocity (< 5 pixels/ms)
   * - Consistent scrolling (low variance)
   * - Longer duration (> 2 seconds)
   */
  private detectReadingMode(velocity: number, _timeDelta: number): void {
    const isSlowScroll = velocity < 5; // pixels per millisecond
    const isConsistent = this.velocityHistory.length > 5 && 
                        this.calculateVelocityVariance() < 2.0;
    
    if (isSlowScroll && isConsistent) {
      if (!this.isReadingMode) {
        this.isReadingMode = true;
        this.readingModeStartTime = performance.now();
        if (CONSTANTS.DEBUG.ENABLED) {
          Logger.debug('Reading mode detected');
        }
      }
    } else {
      // Exit reading mode if scrolling becomes fast or inconsistent
      if (this.isReadingMode && (velocity > 10 || !isConsistent)) {
        this.isReadingMode = false;
        if (CONSTANTS.DEBUG.ENABLED) {
          Logger.debug('Reading mode exited');
        }
      }
    }
  }
  
  /**
   * Calculate variance in velocity history
   * Low variance = consistent scrolling (reading pattern)
   */
  private calculateVelocityVariance(): number {
    if (this.velocityHistory.length < 2) {
      return 0;
    }
    
    const mean = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;
    const variance = this.velocityHistory.reduce((sum, v) => {
      return sum + Math.pow(v - mean, 2);
    }, 0) / this.velocityHistory.length;
    
    return variance;
  }
  
  /**
   * Get timing noise based on privacy level
   */
  private getTimingNoise(): number {
    const baseNoise = CONSTANTS.SCROLL.TIMING_NOISE_MS;
    
    switch (this.privacyLevel) {
      case 'low':
        return (Math.random() - 0.5) * baseNoise * 0.5;  // ±5ms
      case 'medium':
        return (Math.random() - 0.5) * baseNoise;        // ±10ms
      case 'high':
        return (Math.random() - 0.5) * baseNoise * 1.5;  // ±15ms
    }
  }
  
  /**
   * Get velocity multiplier with noise
   */
  private getVelocityMultiplier(_currentVelocity: number): number {
    const baseNoise = CONSTANTS.SCROLL.VELOCITY_NOISE_PERCENT;
    
    // Reading mode: less variation (more natural)
    const readingAdjustment = this.isReadingMode ? 0.5 : 1.0;
    
    // Generate Gaussian noise for velocity
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const noise = (z * baseNoise / 3) * readingAdjustment;
    return 1.0 + noise;
  }
  
  /**
   * Check if natural pause should be introduced
   * Natural pauses occur ~3% of the time during scrolling
   */
  shouldAddPause(): boolean {
    if (!CONSTANTS.SCROLL.ENABLED) {
      return false;
    }
    
    // Reading mode: slightly higher pause probability (more natural)
    const pauseProbability = this.isReadingMode 
      ? CONSTANTS.SCROLL.PAUSE_PROBABILITY * 1.5
      : CONSTANTS.SCROLL.PAUSE_PROBABILITY;
    
    return Math.random() < pauseProbability;
  }
  
  /**
   * Get pause duration in milliseconds
   */
  getPauseDuration(): number {
    // Reading mode: longer pauses (more natural)
    const basePause = CONSTANTS.SCROLL.PAUSE_DURATION_MS;
    return this.isReadingMode ? basePause * 1.5 : basePause;
  }
  
  /**
   * Get acceleration noise multiplier
   * Varies scroll acceleration patterns
   */
  getAccelerationNoise(): number {
    if (!CONSTANTS.SCROLL.ENABLED) {
      return 1.0;
    }
    
    const baseNoise = CONSTANTS.SCROLL.ACCELERATION_NOISE;
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return 1.0 + (z * baseNoise / 3);
  }
  
  /**
   * Reset tracking state (called when protection disabled)
   */
  reset(): void {
    this.lastScrollPosition = null;
    this.lastScrollTimestamp = 0;
    this.velocityHistory = [];
    this.isReadingMode = false;
    this.readingModeStartTime = 0;
  }
  
  /**
   * Update scroll position (called after scroll event)
   */
  updateScrollPosition(x: number, y: number): void {
    this.lastScrollPosition = { x, y };
  }
}

