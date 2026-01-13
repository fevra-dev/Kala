/**
 * Main constants export
 * 
 * This file maintains backward compatibility by re-exporting all constants
 * in the same structure as the original constants.ts file
 * 
 * ORGANIZATION:
 * - delays.ts: Delay-related constants
 * - performance.ts: Performance targets
 * - storage.ts: Storage keys
 * - trackers.ts: Tracker detection config
 * - debug.ts: Debug flags
 * - evasion.ts: Evasion techniques
 * - mouse.ts: Mouse obfuscation config
 * - scroll.ts: Scroll obfuscation config
 */

import { DELAY_CONSTANTS, CONTEXT_ADJUSTMENT } from './delays';
import { PERFORMANCE_CONSTANTS } from './performance';
import { STORAGE_KEYS } from './storage';
import { TRACKER_DETECTION, KNOWN_TRACKERS } from './trackers';
import { DEBUG_CONSTANTS } from './debug';
import { EVASION_CONSTANTS, WORD_BOUNDARY, ADVANCED_PROTECTIONS, ADVANCED_PROTECTIONS_V2 } from './evasion';
import { MOUSE_CONSTANTS } from './mouse';
import { SCROLL_CONSTANTS } from './scroll';
import { Preset, PresetConfig } from '../types';

/**
 * Core configuration constants for the extension
 * These values are tuned based on academic research showing
 * 50-200ms delays reduce identification accuracy from 90% to 20-30%
 * 
 * BACKWARD COMPATIBILITY: This maintains the same structure as the original
 * constants.ts file, so existing imports continue to work.
 */
export const CONSTANTS = {
  // Delay ranges in milliseconds
  DELAY: DELAY_CONSTANTS,
  
  // Context-based adjustments (additive to base delay)
  CONTEXT_ADJUSTMENT: CONTEXT_ADJUSTMENT,
  
  // Performance targets
  PERFORMANCE: PERFORMANCE_CONSTANTS,
  
  // Chrome storage API keys
  STORAGE_KEYS: STORAGE_KEYS,
  
  // Tracker detection configuration
  TRACKER_DETECTION: TRACKER_DETECTION,
  
  // Debug configuration
  DEBUG: DEBUG_CONSTANTS,
  
  // Security/Evasion configuration
  EVASION: EVASION_CONSTANTS,
  
  // Word boundary detection configuration
  WORD_BOUNDARY: WORD_BOUNDARY,
  
  // Phase 3 advanced protections
  ADVANCED_PROTECTIONS: ADVANCED_PROTECTIONS,
  
  // Phase 4 cutting-edge protections (2025+)
  ADVANCED_PROTECTIONS_V2: ADVANCED_PROTECTIONS_V2,
  
  // Mouse movement obfuscation configuration
  MOUSE: MOUSE_CONSTANTS,
  
  // Scroll pattern obfuscation configuration
  SCROLL: SCROLL_CONSTANTS
};

/**
 * Known behavioral tracker signatures
 * Re-exported for convenience
 */
export { KNOWN_TRACKERS };

/**
 * Export Preset type for convenience
 */
export type { Preset, PresetConfig } from '../types';

/**
 * UX IMPROVEMENT: Preset configurations for easy setup
 * Inspired by AdGuard's preset configurations
 */
export const PRESETS: Record<Preset, PresetConfig> = {
  gaming: {
    name: 'Gaming Mode',
    description: 'Low obfuscation, high responsiveness',
    privacyLevel: 'low',
    advancedProtections: {
      digraphNoise: false,
      sessionRandomization: false,
      webworkerProtection: false,
      mlEvasion: false
    }
  },
  privacy: {
    name: 'Privacy Mode',
    description: 'High obfuscation, maximum protection',
    privacyLevel: 'high',
    advancedProtections: {
      digraphNoise: true,
      sessionRandomization: true,
      webworkerProtection: true,
      mlEvasion: true
    }
  },
  balanced: {
    name: 'Balanced',
    description: 'Medium obfuscation, good balance',
    privacyLevel: 'medium',
    advancedProtections: {
      digraphNoise: true,
      sessionRandomization: true,
      webworkerProtection: false,
      mlEvasion: true
    }
  },
  custom: {
    name: 'Custom',
    description: 'User-defined settings',
    privacyLevel: 'medium',
    advancedProtections: {
      digraphNoise: false,
      sessionRandomization: false,
      webworkerProtection: false,
      mlEvasion: false
    }
  }
};

