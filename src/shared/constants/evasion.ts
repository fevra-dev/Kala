/**
 * Security/Evasion technique configuration
 */

export const EVASION_CONSTANTS = {
  USE_GAUSSIAN_DISTRIBUTION: true,  // Use normal distribution instead of uniform
  ADD_MICRO_JITTER: true,          // Add microsecond-level timing jitter
  COARSEN_PERFORMANCE_NOW: true,   // Reduce performance.now() precision
  MICRO_JITTER_RANGE_MS: 0.5       // ±0.25ms micro-jitter range
};

/**
 * Word boundary detection configuration
 */
export const WORD_BOUNDARY = {
  ENABLED: true,               // Enable word-boundary detection
  BASE_PAUSE_MS: 100,          // Base pause duration between words
  VARIANCE_MS: 50,             // Variance for Gaussian distribution
  MIN_PAUSE_MS: 50,            // Minimum pause duration
  MAX_PAUSE_MS: 150            // Maximum pause duration
};

/**
 * Phase 3 advanced protections
 */
export const ADVANCED_PROTECTIONS = {
  DIGRAPH_NOISE: true,         // Enable digraph pattern noise
  SESSION_RANDOMIZATION: true,  // Enable session-based randomization
  WEBWORKER_PROTECTION: true,  // Enable Web Worker timing protection
  ML_EVASION: true             // Enable ML evasion patterns
};

/**
 * Phase 4 - Cutting-edge protections (2025+)
 * Based on latest research: BeCAPTCHA-Mouse, BehaveFormer, DeepKey
 */
export const ADVANCED_PROTECTIONS_V2 = {
  // Touch event fingerprinting protection
  TOUCH_OBFUSCATION: true,
  
  // Device motion sensor protection (accelerometer/gyroscope)
  DEVICE_MOTION_PROTECTION: true,
  
  // Advanced timing attack protection
  RAF_TIMING_PROTECTION: true,      // requestAnimationFrame timing
  AUDIO_TIMING_PROTECTION: true,    // AudioContext.currentTime
  EVENT_TIMESTAMP_COARSENING: true, // Event.timeStamp precision reduction
  
  // Interaction pattern protection
  FOCUS_BLUR_PROTECTION: true,      // Tab switching patterns
  FORM_FIELD_PROTECTION: true,      // Form interaction patterns
  CLIPBOARD_PROTECTION: true,       // Copy/paste timing
  CLICK_PATTERN_PROTECTION: true,   // Click/double-click patterns
  HOVER_DWELL_PROTECTION: true,     // Hover time before click
  
  // Synthetic event detection evasion
  SYNTHETIC_EVENT_HIDING: true,     // Hide that events are synthetic
  
  // Pointer events (combined mouse/touch/pen)
  POINTER_EVENT_PROTECTION: true
};
