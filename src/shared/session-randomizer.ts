import { CONSTANTS } from './constants';

/**
 * Session-Based Randomization
 * 
 * Varies behavior patterns per browser session to prevent cross-session correlation.
 * Each session gets a unique seed that creates consistent but varied behavior.
 * 
 * SECURITY: Prevents trackers from correlating behavior across sessions.
 * Even if a tracker identifies you in one session, the next session will
 * have different timing patterns.
 * 
 * TECHNIQUE: Uses a session seed to generate consistent variations that
 * change between browser sessions but remain stable within a session.
 */
export class SessionRandomizer {
  private static sessionSeed: number | null = null;
  private static initialized: boolean = false;
  
  /**
   * Initialize session randomizer
   * Generates a unique seed for this browser session
   * 
   * Called once when extension loads
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }
    
    // Generate session seed based on:
    // 1. Current timestamp (changes each session)
    // 2. Random component (adds unpredictability)
    // 3. Browser fingerprint components (if available)
    
    const timestamp = Date.now();
    const random = Math.random() * 10000;
    
    // Combine into seed (0-10000 range)
    this.sessionSeed = (timestamp % 10000) + random;
    
    // Normalize to 0-10000 range
    this.sessionSeed = this.sessionSeed % 10000;
    
    this.initialized = true;
  }
  
  /**
   * Get session variation for delay calculations
   * 
   * @returns Variation in milliseconds (±10ms per session)
   * 
   * This variation is consistent within a session but changes between sessions.
   * Applied to base delays to create unique session fingerprints.
   */
  static getSessionVariation(): number {
    if (!this.initialized || this.sessionSeed === null) {
      this.initialize();
    }
    
    // Use sine function to create smooth variation from seed
    // This ensures consistent behavior within session
    const normalized = (this.sessionSeed! / 10000) * Math.PI * 2;
    const variation = Math.sin(normalized) * 10; // ±10ms variation
    
    return variation;
  }
  
  /**
   * Get session-specific multiplier for delays
   * 
   * @returns Multiplier between 0.9 and 1.1 (10% variation)
   * 
   * Useful for scaling entire delay calculations per session
   */
  static getSessionMultiplier(): number {
    if (!this.initialized || this.sessionSeed === null) {
      this.initialize();
    }
    
    // Use cosine for different phase than variation
    const normalized = (this.sessionSeed! / 10000) * Math.PI * 2;
    const multiplier = 1.0 + (Math.cos(normalized) * 0.1); // 0.9-1.1 range
    
    return multiplier;
  }
  
  /**
   * Get session seed (for testing/debugging)
   */
  static getSessionSeed(): number {
    if (!this.initialized || this.sessionSeed === null) {
      this.initialize();
    }
    
    return this.sessionSeed!;
  }
  
  /**
   * Reset session (for testing)
   */
  static reset(): void {
    this.sessionSeed = null;
    this.initialized = false;
  }
}

