/**
 * Device Motion/Orientation Protection
 * 
 * Protects against fingerprinting via device sensors:
 * - Accelerometer (hand tremor patterns)
 * - Gyroscope (device handling patterns)
 * - Device orientation (tilt patterns)
 * 
 * Research (DeepKey, 2017) shows device motion patterns are
 * highly unique and can identify users with >95% accuracy.
 * 
 * STRATEGY:
 * 1. Add Gaussian noise to sensor readings
 * 2. Reduce sensor precision
 * 3. Rate-limit sensor events
 * 4. Normalize calibration offsets
 */

import { Logger } from '../shared/logger';

interface MotionData {
  acceleration: { x: number; y: number; z: number } | null;
  accelerationIncludingGravity: { x: number; y: number; z: number } | null;
  rotationRate: { alpha: number; beta: number; gamma: number } | null;
  interval: number;
}

interface OrientationData {
  alpha: number | null;  // Z-axis rotation (0-360)
  beta: number | null;   // X-axis rotation (-180 to 180)
  gamma: number | null;  // Y-axis rotation (-90 to 90)
  absolute: boolean;
}

export class DeviceMotionProtection {
  private enabled: boolean = true;
  private privacyLevel: 'low' | 'medium' | 'high' = 'medium';
  private lastEventTime: number = 0;
  private readonly MIN_EVENT_INTERVAL = 50; // 20 Hz max
  
  // Calibration offset noise (added once per session)
  private calibrationOffset = {
    x: (Math.random() - 0.5) * 0.2,
    y: (Math.random() - 0.5) * 0.2,
    z: (Math.random() - 0.5) * 0.2
  };
  
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
   * Check if event should be rate-limited
   */
  shouldRateLimit(): boolean {
    if (!this.enabled) return false;
    
    const now = performance.now();
    if (now - this.lastEventTime < this.MIN_EVENT_INTERVAL) {
      return true;
    }
    this.lastEventTime = now;
    return false;
  }
  
  /**
   * Obfuscate device motion event data
   */
  obfuscateMotion(event: DeviceMotionEvent): MotionData {
    if (!this.enabled) {
      return {
        acceleration: event.acceleration ? {
          x: event.acceleration.x || 0,
          y: event.acceleration.y || 0,
          z: event.acceleration.z || 0
        } : null,
        accelerationIncludingGravity: event.accelerationIncludingGravity ? {
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0
        } : null,
        rotationRate: event.rotationRate ? {
          alpha: event.rotationRate.alpha || 0,
          beta: event.rotationRate.beta || 0,
          gamma: event.rotationRate.gamma || 0
        } : null,
        interval: event.interval
      };
    }
    
    const noise = this.getNoiseLevel();
    
    return {
      acceleration: event.acceleration ? this.obfuscateAcceleration(
        event.acceleration.x || 0,
        event.acceleration.y || 0,
        event.acceleration.z || 0,
        noise
      ) : null,
      accelerationIncludingGravity: event.accelerationIncludingGravity ? this.obfuscateAcceleration(
        event.accelerationIncludingGravity.x || 0,
        event.accelerationIncludingGravity.y || 0,
        event.accelerationIncludingGravity.z || 0,
        noise
      ) : null,
      rotationRate: event.rotationRate ? this.obfuscateRotation(
        event.rotationRate.alpha || 0,
        event.rotationRate.beta || 0,
        event.rotationRate.gamma || 0,
        noise
      ) : null,
      interval: this.obfuscateInterval(event.interval)
    };
  }
  
  /**
   * Obfuscate device orientation event data
   */
  obfuscateOrientation(event: DeviceOrientationEvent): OrientationData {
    if (!this.enabled) {
      return {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute
      };
    }
    
    const noise = this.getNoiseLevel();
    
    return {
      alpha: event.alpha !== null ? this.quantize(event.alpha + this.generateNoise(noise * 2), 1) : null,
      beta: event.beta !== null ? this.quantize(event.beta + this.generateNoise(noise * 2), 1) : null,
      gamma: event.gamma !== null ? this.quantize(event.gamma + this.generateNoise(noise), 1) : null,
      absolute: event.absolute
    };
  }
  
  /**
   * Obfuscate acceleration values
   */
  private obfuscateAcceleration(x: number, y: number, z: number, noise: number): { x: number; y: number; z: number } {
    return {
      x: this.quantize(x + this.calibrationOffset.x + this.generateNoise(noise), 0.1),
      y: this.quantize(y + this.calibrationOffset.y + this.generateNoise(noise), 0.1),
      z: this.quantize(z + this.calibrationOffset.z + this.generateNoise(noise), 0.1)
    };
  }
  
  /**
   * Obfuscate rotation rate values
   */
  private obfuscateRotation(alpha: number, beta: number, gamma: number, noise: number): { alpha: number; beta: number; gamma: number } {
    return {
      alpha: this.quantize(alpha + this.generateNoise(noise * 5), 1),
      beta: this.quantize(beta + this.generateNoise(noise * 5), 1),
      gamma: this.quantize(gamma + this.generateNoise(noise * 5), 1)
    };
  }
  
  /**
   * Obfuscate event interval to prevent timing fingerprinting
   */
  private obfuscateInterval(interval: number): number {
    // Round to common intervals: 16ms (60Hz), 20ms (50Hz), 33ms (30Hz)
    const commonIntervals = [16, 20, 33];
    return commonIntervals.reduce((prev, curr) =>
      Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev
    );
  }
  
  /**
   * Generate Gaussian noise
   */
  private generateNoise(magnitude: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * magnitude;
  }
  
  /**
   * Get noise level based on privacy setting
   */
  private getNoiseLevel(): number {
    return {
      low: 0.05,
      medium: 0.1,
      high: 0.2
    }[this.privacyLevel];
  }
  
  /**
   * Quantize value to reduce precision
   */
  private quantize(value: number, step: number): number {
    return Math.round(value / step) * step;
  }
  
  /**
   * Regenerate calibration offset (call on session change)
   */
  regenerateCalibration(): void {
    this.calibrationOffset = {
      x: (Math.random() - 0.5) * 0.2,
      y: (Math.random() - 0.5) * 0.2,
      z: (Math.random() - 0.5) * 0.2
    };
    Logger.debug('Device motion calibration offset regenerated');
  }
}
