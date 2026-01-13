/**
 * Touch Event Obfuscator
 * 
 * Obfuscates touch interaction patterns to prevent mobile behavioral fingerprinting.
 * Research shows touch patterns are highly unique (BehaveFormer, 2023):
 * - Touch pressure variations
 * - Touch radius (finger size)
 * - Multi-touch timing
 * - Swipe velocity curves
 * - Tap duration patterns
 * 
 * STRATEGY:
 * 1. Add Gaussian noise to touch coordinates
 * 2. Normalize touch radius to common values
 * 3. Clamp pressure to discrete levels
 * 4. Add timing jitter to touch sequences
 */

import { Logger } from '../shared/logger';

interface ObfuscatedTouchData {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
  radiusX: number;
  radiusY: number;
  force: number;
  rotationAngle: number;
  identifier: number;
}

export class TouchObfuscator {
  private enabled: boolean = true;
  private privacyLevel: 'low' | 'medium' | 'high' = 'medium';
  private lastTouchTime: number = 0;
  
  // Common touch radius values to normalize to (prevents fingerprinting via finger size)
  private static readonly COMMON_RADII = [11.5, 12, 12.5, 13, 13.5, 14];
  
  // Discrete pressure levels (prevents precise force fingerprinting)
  private static readonly PRESSURE_LEVELS = [0, 0.25, 0.5, 0.75, 1.0];
  
  /**
   * Set privacy level
   */
  setPrivacyLevel(level: 'low' | 'medium' | 'high'): void {
    this.privacyLevel = level;
  }
  
  /**
   * Enable/disable touch obfuscation
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Obfuscate a touch event
   * 
   * @param touch - Original Touch object
   * @returns Obfuscated touch data
   */
  obfuscateTouch(touch: Touch): ObfuscatedTouchData {
    if (!this.enabled) {
      return this.cloneTouch(touch);
    }
    
    const noiseRange = this.getNoiseRange();
    const noise = this.generateGaussianNoise(noiseRange);
    
    // Normalize radius to common values (prevents finger size fingerprinting)
    const normalizedRadius = this.normalizeRadius(touch.radiusX, touch.radiusY);
    
    // Quantize force to discrete levels
    const quantizedForce = this.quantizeForce(touch.force);
    
    // Add small angle noise to rotation
    const rotationNoise = (Math.random() - 0.5) * 10; // ±5 degrees
    
    return {
      clientX: touch.clientX + noise.x,
      clientY: touch.clientY + noise.y,
      screenX: touch.screenX + noise.x,
      screenY: touch.screenY + noise.y,
      pageX: touch.pageX + noise.x,
      pageY: touch.pageY + noise.y,
      radiusX: normalizedRadius.x,
      radiusY: normalizedRadius.y,
      force: quantizedForce,
      rotationAngle: touch.rotationAngle + rotationNoise,
      identifier: touch.identifier
    };
  }
  
  /**
   * Get timing jitter for touch events
   * Prevents timing-based fingerprinting of tap patterns
   */
  getTouchTimingJitter(): number {
    const baseJitter = {
      low: 5,
      medium: 15,
      high: 30
    }[this.privacyLevel];
    
    return (Math.random() - 0.5) * 2 * baseJitter;
  }
  
  /**
   * Check if double-tap interval should be normalized
   * Double-tap timing is highly unique
   */
  shouldNormalizeDoubleTap(): boolean {
    const now = performance.now();
    const timeSinceLastTouch = now - this.lastTouchTime;
    this.lastTouchTime = now;
    
    // If within double-tap window, add jitter
    return timeSinceLastTouch < 400 && timeSinceLastTouch > 100;
  }
  
  /**
   * Get double-tap delay to add
   */
  getDoubleTapDelay(): number {
    // Normalize to ~300ms double-tap interval with some variance
    return 280 + Math.random() * 40;
  }
  
  /**
   * Generate Gaussian noise for coordinates
   */
  private generateGaussianNoise(range: number): { x: number; y: number } {
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    return {
      x: z1 * (range / 3),
      y: z2 * (range / 3)
    };
  }
  
  /**
   * Get noise range based on privacy level
   */
  private getNoiseRange(): number {
    return {
      low: 1,
      medium: 2,
      high: 4
    }[this.privacyLevel];
  }
  
  /**
   * Normalize touch radius to common values
   * Prevents fingerprinting via finger size
   */
  private normalizeRadius(radiusX: number, radiusY: number): { x: number; y: number } {
    // Find closest common radius
    const avgRadius = (radiusX + radiusY) / 2;
    const normalizedRadius = TouchObfuscator.COMMON_RADII.reduce((prev, curr) => 
      Math.abs(curr - avgRadius) < Math.abs(prev - avgRadius) ? curr : prev
    );
    
    // Add small variance
    const variance = (Math.random() - 0.5) * 0.5;
    
    return {
      x: normalizedRadius + variance,
      y: normalizedRadius + variance
    };
  }
  
  /**
   * Quantize force to discrete levels
   * Prevents precise pressure fingerprinting
   */
  private quantizeForce(force: number): number {
    if (force === 0) return 0;
    
    // Find closest discrete level
    return TouchObfuscator.PRESSURE_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - force) < Math.abs(prev - force) ? curr : prev
    );
  }
  
  /**
   * Clone touch without obfuscation
   */
  private cloneTouch(touch: Touch): ObfuscatedTouchData {
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
      force: touch.force,
      rotationAngle: touch.rotationAngle,
      identifier: touch.identifier
    };
  }
}
