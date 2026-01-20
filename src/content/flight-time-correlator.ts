/**
 * Flight Time Correlator
 * 
 * Manages correlated keydown/keyup timing (flight time) for realistic
 * keystroke synthesis. Research shows flight time (key hold duration)
 * is highly distinctive and used by behavioral biometrics systems.
 * 
 * Key insight: Flight time is NOT independent of inter-key interval.
 * Fast typists have shorter flight times, slower typists hold keys longer.
 * 
 * Academic basis: "DeepKey" (2022), "TypeNet" (2023)
 * Shows flight time correlation is a top-10 feature for identification
 */

import { Logger } from '../shared/logger';

interface KeyFlightInfo {
  key: string;
  keydownTime: number;
  scheduledKeyupTime: number;
  flightTime: number;
}

interface TypingRhythm {
  averageFlightTime: number;
  averageInterKeyInterval: number;
  flightTimeVariance: number;
}

export class FlightTimeCorrelator {
  private pendingKeyups: Map<string, KeyFlightInfo> = new Map();
  private flightTimeHistory: number[] = [];
  private enabled: boolean = true;
  private privacyLevel: 'low' | 'medium' | 'high' = 'medium';
  
  // Typical human flight time ranges (milliseconds)
  private static readonly MIN_FLIGHT_TIME = 50;   // Very fast tap
  private static readonly MAX_FLIGHT_TIME = 200;  // Deliberate press
  private static readonly AVERAGE_FLIGHT_TIME = 90;
  
  // Correlation factors
  private static readonly FAST_TYPING_FLIGHT_REDUCTION = 0.7;  // Fast typing = shorter flight
  private static readonly SLOW_TYPING_FLIGHT_INCREASE = 1.3;   // Slow typing = longer flight
  
  constructor() {}
  
  /**
   * Set privacy level
   */
  setPrivacyLevel(level: 'low' | 'medium' | 'high'): void {
    this.privacyLevel = level;
  }
  
  /**
   * Enable/disable correlation
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Record keydown and calculate expected flight time
   * 
   * @param key - Key pressed
   * @param keydownDelay - Delay applied to keydown event
   * @returns Expected flight time in ms
   */
  recordKeydown(key: string, keydownDelay: number): number {
    if (!this.enabled) {
      return this.getDefaultFlightTime();
    }
    
    const now = performance.now();
    
    // Calculate flight time based on typing speed (keydown delay)
    // Faster typing (lower delay) = shorter flight time
    const speedFactor = this.calculateSpeedFactor(keydownDelay);
    const baseFlightTime = FlightTimeCorrelator.AVERAGE_FLIGHT_TIME * speedFactor;
    
    // Add noise based on privacy level
    const noise = this.getFlightTimeNoise();
    let flightTime = baseFlightTime + noise;
    
    // Clamp to realistic range
    flightTime = Math.max(
      FlightTimeCorrelator.MIN_FLIGHT_TIME,
      Math.min(FlightTimeCorrelator.MAX_FLIGHT_TIME, flightTime)
    );
    
    // Store pending keyup
    const keyInfo: KeyFlightInfo = {
      key,
      keydownTime: now,
      scheduledKeyupTime: now + flightTime,
      flightTime
    };
    
    this.pendingKeyups.set(key, keyInfo);
    
    // Track history for pattern analysis
    this.flightTimeHistory.push(flightTime);
    if (this.flightTimeHistory.length > 50) {
      this.flightTimeHistory.shift();
    }
    
    Logger.debug(`Flight time for '${key}': ${flightTime.toFixed(1)}ms (speed factor: ${speedFactor.toFixed(2)})`);
    
    return flightTime;
  }
  
  /**
   * Get keyup delay that maintains correlation with keydown
   * 
   * @param key - Key released
   * @param keydownDispatchTime - When keydown was actually dispatched
   * @returns Delay for keyup to maintain proper flight time
   */
  getKeyupDelay(key: string, keydownDispatchTime: number): number {
    const keyInfo = this.pendingKeyups.get(key);
    
    if (!keyInfo) {
      // No recorded keydown, use default flight time
      return this.getDefaultFlightTime();
    }
    
    const now = performance.now();
    const elapsedSinceKeydown = now - keydownDispatchTime;
    const targetFlightTime = keyInfo.flightTime;
    
    // Calculate delay needed to achieve target flight time
    let keyupDelay = targetFlightTime - elapsedSinceKeydown;
    
    // Add small jitter to keyup as well
    keyupDelay += this.getKeyupJitter();
    
    // Ensure minimum delay
    keyupDelay = Math.max(5, keyupDelay);
    
    // Cleanup
    this.pendingKeyups.delete(key);
    
    Logger.debug(`Keyup delay for '${key}': ${keyupDelay.toFixed(1)}ms (target flight: ${targetFlightTime.toFixed(1)}ms)`);
    
    return keyupDelay;
  }
  
  /**
   * Calculate speed factor based on keydown delay
   * Lower delay = faster typing = shorter flight time
   */
  private calculateSpeedFactor(keydownDelay: number): number {
    // Typical typing delays: 50-200ms between keys
    // Map delay to speed factor
    
    if (keydownDelay < 50) {
      // Very fast typing
      return FlightTimeCorrelator.FAST_TYPING_FLIGHT_REDUCTION;
    } else if (keydownDelay > 150) {
      // Slow/deliberate typing
      return FlightTimeCorrelator.SLOW_TYPING_FLIGHT_INCREASE;
    } else {
      // Linear interpolation for middle range
      const t = (keydownDelay - 50) / 100;
      return FlightTimeCorrelator.FAST_TYPING_FLIGHT_REDUCTION + 
             t * (FlightTimeCorrelator.SLOW_TYPING_FLIGHT_INCREASE - FlightTimeCorrelator.FAST_TYPING_FLIGHT_REDUCTION);
    }
  }
  
  /**
   * Get flight time noise based on privacy level
   */
  private getFlightTimeNoise(): number {
    const noiseRange = {
      low: 10,
      medium: 20,
      high: 35
    }[this.privacyLevel];
    
    // Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return z * (noiseRange / 3);
  }
  
  /**
   * Get additional jitter for keyup events
   */
  private getKeyupJitter(): number {
    const jitterRange = {
      low: 3,
      medium: 5,
      high: 8
    }[this.privacyLevel];
    
    return (Math.random() - 0.5) * 2 * jitterRange;
  }
  
  /**
   * Get default flight time when no correlation available
   */
  private getDefaultFlightTime(): number {
    return FlightTimeCorrelator.AVERAGE_FLIGHT_TIME + this.getFlightTimeNoise();
  }
  
  /**
   * Get current typing rhythm (for analysis/debugging)
   */
  getRhythm(): TypingRhythm {
    if (this.flightTimeHistory.length === 0) {
      return {
        averageFlightTime: FlightTimeCorrelator.AVERAGE_FLIGHT_TIME,
        averageInterKeyInterval: 100,
        flightTimeVariance: 20
      };
    }
    
    const sum = this.flightTimeHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.flightTimeHistory.length;
    
    const variance = this.flightTimeHistory.reduce((acc, val) => 
      acc + Math.pow(val - avg, 2), 0) / this.flightTimeHistory.length;
    
    return {
      averageFlightTime: avg,
      averageInterKeyInterval: 100, // Would need inter-key tracking
      flightTimeVariance: Math.sqrt(variance)
    };
  }
  
  /**
   * Reset state
   */
  reset(): void {
    this.pendingKeyups.clear();
    this.flightTimeHistory = [];
  }
}
