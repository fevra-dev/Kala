/**
 * Scroll pattern obfuscation configuration
 */

export const SCROLL_CONSTANTS = {
  ENABLED: true,                // Enable scroll pattern obfuscation
  VELOCITY_NOISE_PERCENT: 0.15, // ±15% scroll velocity variation
  TIMING_NOISE_MS: 10,          // ±10ms timing noise
  PAUSE_PROBABILITY: 0.03,      // 3% chance of natural pause
  PAUSE_DURATION_MS: 50,        // Pause duration (50ms)
  ACCELERATION_NOISE: 0.1,      // ±10% acceleration variation
  READING_MODE: true            // Detect reading patterns
};

