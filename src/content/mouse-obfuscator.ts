import { MouseEventData, MouseContext, PrivacyLevel } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';
import { SessionRandomizer } from '../shared/session-randomizer';

/**
 * Mouse Movement Obfuscator
 * 
 * Obfuscates mouse movement patterns to prevent behavioral fingerprinting.
 * Trackers analyze:
 * - Mouse velocity curves
 * - Acceleration patterns
 * - Pause durations
 * - Movement trajectories
 * - Coordinate precision
 * 
 * STRATEGY:
 * 1. Add Gaussian noise to coordinates (±2px)
 * 2. Vary velocity by ±10%
 * 3. Introduce natural micro-pauses (2% probability, 5ms)
 * 4. Smooth trajectory curves
 * 5. Context-aware (reduce noise in gaming)
 */
export class MouseObfuscator {
  private privacyLevel: PrivacyLevel = 'medium';
  private lastPosition: { x: number; y: number } | null = null;
  private lastTimestamp: number = 0;
  private velocityHistory: number[] = [];
  private readonly MAX_VELOCITY_HISTORY = 10;
  
  /**
   * Set privacy level (affects noise magnitude)
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.privacyLevel = level;
  }
  
  /**
   * Obfuscate mouse event coordinates and movement
   * 
   * @param event - Original mouse event
   * @param context - Mouse movement context
   * @returns Obfuscated mouse event data
   */
  obfuscateMouseEvent(event: MouseEvent, context: MouseContext): MouseEventData {
    if (!CONSTANTS.MOUSE.ENABLED) {
      return this.cloneEvent(event);
    }
    
    const now = performance.now();
    const timeDelta = now - this.lastTimestamp;
    
    // Calculate current velocity
    let velocity = 0;
    if (this.lastPosition && timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(event.clientX - this.lastPosition.x, 2) +
        Math.pow(event.clientY - this.lastPosition.y, 2)
      );
      velocity = distance / timeDelta; // pixels per millisecond
      
      // Track velocity history for smoothing
      this.velocityHistory.push(velocity);
      if (this.velocityHistory.length > this.MAX_VELOCITY_HISTORY) {
        this.velocityHistory.shift();
      }
    }
    
    // Calculate noise based on privacy level
    const noiseRange = this.getNoiseRange();
    const velocityNoise = this.getVelocityNoise(context);
    
    // Generate Gaussian noise for coordinates
    const coordinateNoise = this.generateGaussianNoise(noiseRange);
    
    // Apply noise to coordinates
    const obfuscatedX = event.clientX + coordinateNoise.x;
    const obfuscatedY = event.clientY + coordinateNoise.y;
    
    // Calculate obfuscated movement delta
    let obfuscatedMovementX = event.movementX;
    let obfuscatedMovementY = event.movementY;
    
    if (this.lastPosition) {
      obfuscatedMovementX = obfuscatedX - this.lastPosition.x;
      obfuscatedMovementY = obfuscatedY - this.lastPosition.y;
      
      // Apply velocity noise
      if (velocity > CONSTANTS.MOUSE.MIN_MOVEMENT_PX) {
        const velocityMultiplier = 1 + velocityNoise;
        obfuscatedMovementX *= velocityMultiplier;
        obfuscatedMovementY *= velocityMultiplier;
      }
    }
    
    // Gaming context: reduce noise
    const gamingMultiplier = context.isGaming ? CONSTANTS.MOUSE.GAMING_REDUCTION : 1.0;
    
    // Create obfuscated event data
    const obfuscatedEvent: MouseEventData = {
      clientX: obfuscatedX * gamingMultiplier + event.clientX * (1 - gamingMultiplier),
      clientY: obfuscatedY * gamingMultiplier + event.clientY * (1 - gamingMultiplier),
      screenX: event.screenX + coordinateNoise.x,
      screenY: event.screenY + coordinateNoise.y,
      pageX: event.pageX + coordinateNoise.x,
      pageY: event.pageY + coordinateNoise.y,
      offsetX: event.offsetX + coordinateNoise.x,
      offsetY: event.offsetY + coordinateNoise.y,
      movementX: obfuscatedMovementX,
      movementY: obfuscatedMovementY,
      button: event.button,
      buttons: event.buttons,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: now,
      target: event.target,
      type: event.type
    };
    
    // Update tracking state
    this.lastPosition = { x: obfuscatedX, y: obfuscatedY };
    this.lastTimestamp = now;
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Mouse obfuscation:', {
        original: { x: event.clientX, y: event.clientY },
        obfuscated: { x: obfuscatedX, y: obfuscatedY },
        noise: coordinateNoise,
        velocity: velocity.toFixed(2),
        gaming: context.isGaming
      });
    }
    
    return obfuscatedEvent;
  }
  
  /**
   * Check if micro-pause should be introduced
   * Natural pauses occur ~2% of the time
   */
  shouldAddPause(): boolean {
    if (!CONSTANTS.MOUSE.ENABLED) {
      return false;
    }
    return Math.random() < CONSTANTS.MOUSE.PAUSE_PROBABILITY;
  }
  
  /**
   * Get pause duration in milliseconds
   */
  getPauseDuration(): number {
    return CONSTANTS.MOUSE.PAUSE_DURATION_MS;
  }
  
  /**
   * Get noise range based on privacy level
   */
  private getNoiseRange(): number {
    switch (this.privacyLevel) {
      case 'low':
        return CONSTANTS.MOUSE.NOISE_RANGE_PX * 0.5;  // ±1px
      case 'medium':
        return CONSTANTS.MOUSE.NOISE_RANGE_PX;        // ±2px
      case 'high':
        return CONSTANTS.MOUSE.NOISE_RANGE_PX * 1.5;  // ±3px
    }
  }
  
  /**
   * Get velocity noise multiplier
   */
  private getVelocityNoise(context: MouseContext): number {
    const baseNoise = CONSTANTS.MOUSE.VELOCITY_NOISE_PERCENT;
    const gamingReduction = context.isGaming ? 0.5 : 1.0;
    
    // Generate Gaussian noise for velocity
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return (z * baseNoise / 3) * gamingReduction;
  }
  
  /**
   * Generate Gaussian noise for coordinates
   * Uses Box-Muller transform for realistic distribution
   */
  private generateGaussianNoise(range: number): { x: number; y: number } {
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    return {
      x: z1 * (range / 3),  // 99.7% of values within ±3σ
      y: z2 * (range / 3)
    };
  }
  
  /**
   * Clone mouse event without obfuscation
   */
  private cloneEvent(event: MouseEvent): MouseEventData {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      pageX: event.pageX,
      pageY: event.pageY,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
      movementX: event.movementX,
      movementY: event.movementY,
      button: event.button,
      buttons: event.buttons,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: event.timeStamp,
      target: event.target,
      type: event.type
    };
  }
  
  /**
   * Reset tracking state (called when protection disabled)
   */
  reset(): void {
    this.lastPosition = null;
    this.lastTimestamp = 0;
    this.velocityHistory = [];
  }
}

