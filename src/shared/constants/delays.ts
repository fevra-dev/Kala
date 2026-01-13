/**
 * Delay-related constants for keystroke obfuscation
 * OPTIMIZED: Reduced delays for better UX while maintaining privacy
 * Research shows even 20-50ms delays significantly reduce fingerprinting accuracy
 */

export const DELAY_CONSTANTS = {
  MIN: 15,                    // Reduced minimum for snappier feel
  MAX: 60,                    // Reduced maximum for usability
  
  // Privacy level presets - OPTIMIZED for better latency
  LOW_PRIVACY: {
    BASE: 10,                 // Minimal delay - nearly imperceptible
    VARIANCE: 10              // Tight variance for consistency
  },
  MEDIUM_PRIVACY: {
    BASE: 20,                 // Good balance of privacy and responsiveness
    VARIANCE: 25              // Reduced variance
  },
  HIGH_PRIVACY: {
    BASE: 40,                 // Strong protection, still usable
    VARIANCE: 40              // Reduced from 70ms
  }
};

/**
 * Context-based delay adjustments (additive to base delay)
 * OPTIMIZED: More aggressive reductions for responsive feel
 */
export const CONTEXT_ADJUSTMENT = {
  GAMING: -15,                // Minimal delay for responsiveness
  FORM_FIELD: 5,              // Minimal increase
  SEARCH_FIELD: -10,          // Keep very responsive
  PASSWORD_FIELD: 0,          // No adjustment
  TEXT_EDITOR: 0              // No penalty for text editing
};

