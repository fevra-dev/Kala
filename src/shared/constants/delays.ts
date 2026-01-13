/**
 * Delay-related constants for keystroke obfuscation
 * Based on academic research showing 50-200ms delays reduce identification accuracy
 */

export const DELAY_CONSTANTS = {
  MIN: 50,                    // Absolute minimum to prevent detection
  MAX: 100,                   // Maximum for usability
  
  // Privacy level presets
  LOW_PRIVACY: {
    BASE: 30,                 // Gaming-friendly baseline
    VARIANCE: 20              // Random noise range
  },
  MEDIUM_PRIVACY: {
    BASE: 50,                 // Recommended default
    VARIANCE: 50
  },
  HIGH_PRIVACY: {
    BASE: 80,                 // Maximum obfuscation
    VARIANCE: 70
  }
};

/**
 * Context-based delay adjustments (additive to base delay)
 */
export const CONTEXT_ADJUSTMENT = {
  GAMING: -20,                // Reduce delay for responsiveness
  FORM_FIELD: 10,             // Slight increase acceptable
  SEARCH_FIELD: -10,          // Keep responsive
  PASSWORD_FIELD: 0,          // No adjustment for security
  TEXT_EDITOR: 5              // Minimal impact
};

