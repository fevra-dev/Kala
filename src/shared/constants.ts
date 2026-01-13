/**
 * BACKWARD COMPATIBILITY: Re-export from organized constants
 * 
 * This file maintains backward compatibility by re-exporting the organized
 * constants structure. All existing imports continue to work.
 * 
 * NEW CODE: Import from './constants/index' or './constants/[module]' for better organization
 */
export { CONSTANTS, KNOWN_TRACKERS, PRESETS } from './constants/index';
export type { Preset, PresetConfig } from './constants/index';

