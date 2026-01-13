/**
 * Mouse movement obfuscation configuration
 */

export const MOUSE_CONSTANTS = {
  ENABLED: true,                // Enable mouse movement obfuscation
  NOISE_RANGE_PX: 2,            // ±2 pixels coordinate noise
  VELOCITY_NOISE_PERCENT: 0.1,  // ±10% velocity variation
  PAUSE_PROBABILITY: 0.02,      // 2% chance of micro-pause
  PAUSE_DURATION_MS: 5,         // Micro-pause duration (5ms)
  SMOOTHING_ENABLED: true,      // Smooth trajectory curves
  GAMING_REDUCTION: 0.5,        // 50% noise reduction in gaming
  MIN_MOVEMENT_PX: 0.5         // Minimum movement to obfuscate
};

