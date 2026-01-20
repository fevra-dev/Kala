/**
 * Pointer Event Obfuscator
 * 
 * Handles unified pointer events (mouse, touch, pen) with pressure/tilt
 * normalization. PointerEvents contain additional identifying data:
 * - Pressure (0-1, pen pressure or touch force)
 * - Tilt angles (pen tilt X/Y in degrees)
 * - Twist (pen rotation in degrees)
 * - Width/Height (contact geometry)
 * - Pointer type (mouse, pen, touch)
 * 
 * Research: PointerEvents leak more data than legacy MouseEvents
 * and are used by advanced fingerprinting systems.
 */

import { PrivacyLevel } from '../shared/types';
import { Logger } from '../shared/logger';

interface ObfuscatedPointerData {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  pointerId: number;
  isPrimary: boolean;
}

export class PointerObfuscator {
  private enabled: boolean = true;
  private privacyLevel: PrivacyLevel = 'medium';
  
  // Common pressure values to normalize to (prevents pressure fingerprinting)
  private static readonly PRESSURE_LEVELS = [0, 0.25, 0.5, 0.75, 1.0];
  
  // Common tilt angles to normalize to (prevents tilt fingerprinting)
  private static readonly TILT_ANGLES = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
  
  // Common contact sizes (width/height) in pixels
  private static readonly CONTACT_SIZES = [10, 15, 20, 25, 30];
  
  constructor() {}
  
  /**
   * Set privacy level
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.privacyLevel = level;
  }
  
  /**
   * Enable/disable obfuscation
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Obfuscate pointer event data
   * 
   * @param event - Original PointerEvent
   * @returns Obfuscated pointer data
   */
  obfuscatePointerEvent(event: PointerEvent): ObfuscatedPointerData {
    if (!this.enabled) {
      return this.clonePointerEvent(event);
    }
    
    // Obfuscate coordinates (same as mouse)
    const coordNoise = this.getCoordinateNoise();
    
    // Normalize pressure to discrete levels
    const normalizedPressure = this.normalizePressure(event.pressure);
    
    // Normalize tangential pressure
    const normalizedTangentialPressure = this.normalizePressure(event.tangentialPressure);
    
    // Normalize tilt angles
    const normalizedTiltX = this.normalizeTilt(event.tiltX);
    const normalizedTiltY = this.normalizeTilt(event.tiltY);
    
    // Normalize twist angle
    const normalizedTwist = this.normalizeTwist(event.twist);
    
    // Normalize contact geometry (width/height)
    const normalizedWidth = this.normalizeContactSize(event.width);
    const normalizedHeight = this.normalizeContactSize(event.height);
    
    const obfuscated: ObfuscatedPointerData = {
      clientX: event.clientX + coordNoise.x,
      clientY: event.clientY + coordNoise.y,
      screenX: event.screenX + coordNoise.x,
      screenY: event.screenY + coordNoise.y,
      pageX: event.pageX + coordNoise.x,
      pageY: event.pageY + coordNoise.y,
      width: normalizedWidth,
      height: normalizedHeight,
      pressure: normalizedPressure,
      tangentialPressure: normalizedTangentialPressure,
      tiltX: normalizedTiltX,
      tiltY: normalizedTiltY,
      twist: normalizedTwist,
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      isPrimary: event.isPrimary
    };
    
    Logger.debug('Pointer obfuscation:', {
      originalPressure: event.pressure.toFixed(3),
      normalizedPressure: normalizedPressure.toFixed(3),
      originalTilt: { x: event.tiltX, y: event.tiltY },
      normalizedTilt: { x: normalizedTiltX, y: normalizedTiltY }
    });
    
    return obfuscated;
  }
  
  /**
   * Normalize pressure to discrete levels
   * Prevents precise pressure fingerprinting
   */
  private normalizePressure(pressure: number): number {
    if (pressure === 0) return 0;
    
    // Find closest discrete level
    const normalized = PointerObfuscator.PRESSURE_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - pressure) < Math.abs(prev - pressure) ? curr : prev
    );
    
    // Add small noise based on privacy level
    const noise = this.getPressureNoise();
    
    return Math.max(0, Math.min(1, normalized + noise));
  }
  
  /**
   * Normalize tilt angle to common values
   */
  private normalizeTilt(tilt: number): number {
    if (tilt === 0) return 0;
    
    // Find closest common angle
    const normalized = PointerObfuscator.TILT_ANGLES.reduce((prev, curr) =>
      Math.abs(curr - tilt) < Math.abs(prev - tilt) ? curr : prev
    );
    
    // Add small noise
    const noise = this.getTiltNoise();
    
    return normalized + noise;
  }
  
  /**
   * Normalize twist angle
   */
  private normalizeTwist(twist: number): number {
    // Quantize to 30-degree increments
    const quantized = Math.round(twist / 30) * 30;
    
    // Add small noise
    const noise = this.getTiltNoise();
    
    return (quantized + noise + 360) % 360;
  }
  
  /**
   * Normalize contact size (width/height)
   */
  private normalizeContactSize(size: number): number {
    if (size === 0) return 0;
    
    // Find closest common size
    const normalized = PointerObfuscator.CONTACT_SIZES.reduce((prev, curr) =>
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );
    
    // Add small variance
    const variance = (Math.random() - 0.5) * 2;
    
    return Math.max(1, normalized + variance);
  }
  
  /**
   * Get coordinate noise based on privacy level
   */
  private getCoordinateNoise(): { x: number; y: number } {
    const range = {
      low: 1,
      medium: 2,
      high: 3
    }[this.privacyLevel];
    
    // Gaussian noise
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
   * Get pressure noise
   */
  private getPressureNoise(): number {
    const range = {
      low: 0.02,
      medium: 0.05,
      high: 0.08
    }[this.privacyLevel];
    
    return (Math.random() - 0.5) * 2 * range;
  }
  
  /**
   * Get tilt noise
   */
  private getTiltNoise(): number {
    const range = {
      low: 2,
      medium: 5,
      high: 8
    }[this.privacyLevel];
    
    return (Math.random() - 0.5) * 2 * range;
  }
  
  /**
   * Clone pointer event without obfuscation
   */
  private clonePointerEvent(event: PointerEvent): ObfuscatedPointerData {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      pageX: event.pageX,
      pageY: event.pageY,
      width: event.width,
      height: event.height,
      pressure: event.pressure,
      tangentialPressure: event.tangentialPressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      isPrimary: event.isPrimary
    };
  }
  
  /**
   * Reset state
   */
  reset(): void {
    // No state to reset currently
  }
}
