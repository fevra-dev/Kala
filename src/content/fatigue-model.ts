/**
 * Fatigue Model for Behavioral Biometrics Protection
 * 
 * Simulates natural human fatigue patterns to evade ML-based detection.
 * Research shows typing speed and accuracy degrade predictably over time:
 * - Initial warm-up phase (first 2-5 minutes)
 * - Peak performance (5-30 minutes)
 * - Gradual fatigue (30+ minutes)
 * - Micro-fatigue spikes (every 10-15 minutes)
 * 
 * Academic basis: "Fatigue Effects on Keystroke Dynamics" (2019)
 * Shows 15-25% variation in inter-key intervals due to fatigue
 */

import { Logger } from '../shared/logger';

interface FatigueState {
  sessionStartTime: number;
  lastActivityTime: number;
  keystrokeCount: number;
  fatigueLevel: number;        // 0.0 (fresh) to 1.0 (exhausted)
  warmupComplete: boolean;
}

export class FatigueModel {
  private state: FatigueState;
  private enabled: boolean = true;
  
  // Configuration constants
  private static readonly WARMUP_DURATION_MS = 3 * 60 * 1000;    // 3 minutes warmup
  private static readonly PEAK_DURATION_MS = 25 * 60 * 1000;     // Peak performance until 25 min
  private static readonly MICRO_FATIGUE_INTERVAL_MS = 12 * 60 * 1000; // Micro-fatigue every 12 min
  private static readonly MAX_FATIGUE_EFFECT_MS = 15;             // Max fatigue delay addition
  private static readonly WARMUP_SPEED_REDUCTION = 0.15;          // 15% slower during warmup
  private static readonly MICRO_FATIGUE_SPIKE = 0.2;              // 20% spike during micro-fatigue
  
  constructor() {
    this.state = {
      sessionStartTime: Date.now(),
      lastActivityTime: Date.now(),
      keystrokeCount: 0,
      fatigueLevel: 0,
      warmupComplete: false
    };
  }
  
  /**
   * Enable/disable fatigue modeling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Record keystroke activity
   * Updates fatigue level based on session time and activity
   */
  recordKeystroke(): void {
    this.state.keystrokeCount++;
    this.state.lastActivityTime = Date.now();
    this.updateFatigueLevel();
  }
  
  /**
   * Get fatigue-based delay adjustment
   * Returns additional delay in milliseconds
   * 
   * @returns Delay adjustment in ms (0-15ms typically)
   */
  getFatigueDelay(): number {
    if (!this.enabled) return 0;
    
    const baseDelay = this.state.fatigueLevel * FatigueModel.MAX_FATIGUE_EFFECT_MS;
    
    // Add Gaussian noise to fatigue delay
    const noise = this.generateGaussianNoise(baseDelay * 0.3);
    
    const finalDelay = Math.max(0, baseDelay + noise);
    
    Logger.debug(`Fatigue delay: ${finalDelay.toFixed(2)}ms (level: ${(this.state.fatigueLevel * 100).toFixed(1)}%)`);
    
    return finalDelay;
  }
  
  /**
   * Get warmup speed multiplier
   * Returns a multiplier < 1 during warmup to simulate slower initial typing
   * 
   * @returns Speed multiplier (0.85 during warmup, 1.0 after)
   */
  getWarmupMultiplier(): number {
    if (!this.enabled) return 1.0;
    
    const sessionDuration = Date.now() - this.state.sessionStartTime;
    
    if (sessionDuration >= FatigueModel.WARMUP_DURATION_MS) {
      this.state.warmupComplete = true;
      return 1.0;
    }
    
    // Gradual warmup: start slow, get faster
    const warmupProgress = sessionDuration / FatigueModel.WARMUP_DURATION_MS;
    const speedReduction = FatigueModel.WARMUP_SPEED_REDUCTION * (1 - warmupProgress);
    
    return 1.0 + speedReduction; // Returns 1.15 -> 1.0 over warmup period
  }
  
  /**
   * Check if currently in micro-fatigue spike
   * These are brief periods of reduced performance every ~12 minutes
   */
  isInMicroFatigueSpike(): boolean {
    if (!this.enabled || !this.state.warmupComplete) return false;
    
    const sessionDuration = Date.now() - this.state.sessionStartTime;
    const cyclePosition = sessionDuration % FatigueModel.MICRO_FATIGUE_INTERVAL_MS;
    
    // Micro-fatigue spike lasts ~30 seconds
    const spikeWindow = 30 * 1000;
    
    return cyclePosition < spikeWindow;
  }
  
  /**
   * Get micro-fatigue delay addition
   */
  getMicroFatigueDelay(): number {
    if (!this.isInMicroFatigueSpike()) return 0;
    
    const spikeDelay = FatigueModel.MICRO_FATIGUE_SPIKE * FatigueModel.MAX_FATIGUE_EFFECT_MS;
    return spikeDelay + this.generateGaussianNoise(spikeDelay * 0.5);
  }
  
  /**
   * Get combined fatigue adjustment
   * Includes warmup, base fatigue, and micro-fatigue spikes
   * 
   * @returns Total delay adjustment in ms
   */
  getTotalFatigueAdjustment(): number {
    if (!this.enabled) return 0;
    
    const warmupMultiplier = this.getWarmupMultiplier();
    const fatigueDelay = this.getFatigueDelay();
    const microFatigueDelay = this.getMicroFatigueDelay();
    
    // Warmup affects base timing (multiplier > 1 = slower)
    // Fatigue and micro-fatigue add delay
    const totalAdjustment = (warmupMultiplier - 1) * 20 + fatigueDelay + microFatigueDelay;
    
    return Math.max(0, totalAdjustment);
  }
  
  /**
   * Update fatigue level based on session time
   */
  private updateFatigueLevel(): void {
    const sessionDuration = Date.now() - this.state.sessionStartTime;
    
    // Fatigue ramps up after peak performance period
    if (sessionDuration < FatigueModel.WARMUP_DURATION_MS) {
      // Warmup phase: no fatigue yet
      this.state.fatigueLevel = 0;
    } else if (sessionDuration < FatigueModel.WARMUP_DURATION_MS + FatigueModel.PEAK_DURATION_MS) {
      // Peak performance: minimal fatigue
      this.state.fatigueLevel = 0.1;
    } else {
      // Fatigue phase: gradually increases
      const fatiguePhaseMs = sessionDuration - FatigueModel.WARMUP_DURATION_MS - FatigueModel.PEAK_DURATION_MS;
      const fatigueHours = fatiguePhaseMs / (60 * 60 * 1000);
      
      // Logarithmic fatigue curve (diminishing increase)
      this.state.fatigueLevel = Math.min(1.0, 0.1 + 0.3 * Math.log10(1 + fatigueHours * 10));
    }
  }
  
  /**
   * Generate Gaussian noise using Box-Muller transform
   */
  private generateGaussianNoise(stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stdDev;
  }
  
  /**
   * Reset fatigue model (e.g., on break detection)
   */
  reset(): void {
    const breakDuration = Date.now() - this.state.lastActivityTime;
    
    // If user took a break > 5 minutes, reduce fatigue
    if (breakDuration > 5 * 60 * 1000) {
      this.state.fatigueLevel = Math.max(0, this.state.fatigueLevel - 0.3);
      Logger.debug('Fatigue reduced due to break');
    }
    
    // Full reset for long breaks > 30 minutes
    if (breakDuration > 30 * 60 * 1000) {
      this.state = {
        sessionStartTime: Date.now(),
        lastActivityTime: Date.now(),
        keystrokeCount: 0,
        fatigueLevel: 0,
        warmupComplete: false
      };
      Logger.debug('Fatigue model fully reset');
    }
  }
  
  /**
   * Get current fatigue state (for debugging/UI)
   */
  getState(): Readonly<FatigueState> {
    return { ...this.state };
  }
}
