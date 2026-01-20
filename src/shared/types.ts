// ============================================
// EVENT DATA TYPES
// ============================================

/**
 * Complete keyboard event data captured from native event
 * Used to reconstruct synthetic events with identical properties
 */
export interface KeyboardEventData {
  key: string;                    // 'a', 'Enter', 'Shift'
  code: string;                   // 'KeyA', 'Enter', 'ShiftLeft'
  keyCode: number;                // Legacy key code
  which: number;                  // Legacy key identifier
  charCode: number;               // Character code for printable keys
  location: number;               // 0=standard, 1=left, 2=right, 3=numpad
  repeat: boolean;                // True if key held down
  ctrlKey: boolean;               // Ctrl modifier state
  shiftKey: boolean;              // Shift modifier state
  altKey: boolean;                // Alt/Option modifier state
  metaKey: boolean;               // Command/Win modifier state
  timestamp: number;              // DOMHighResTimeStamp when event occurred
  target: EventTarget | null;     // Element that received the event
}

/**
 * Complete mouse event data captured from native event
 * Used to reconstruct synthetic events with obfuscated coordinates
 */
export interface MouseEventData {
  clientX: number;                // X coordinate relative to viewport
  clientY: number;                // Y coordinate relative to viewport
  screenX: number;                // X coordinate relative to screen
  screenY: number;                // Y coordinate relative to screen
  pageX: number;                  // X coordinate relative to document
  pageY: number;                  // Y coordinate relative to document
  offsetX: number;                // X coordinate relative to target element
  offsetY: number;                // Y coordinate relative to target element
  movementX: number;              // Horizontal movement delta
  movementY: number;              // Vertical movement delta
  button: number;                 // Mouse button (0=left, 1=middle, 2=right)
  buttons: number;                // Bitmask of pressed buttons
  ctrlKey: boolean;               // Ctrl modifier state
  shiftKey: boolean;              // Shift modifier state
  altKey: boolean;                // Alt/Option modifier state
  metaKey: boolean;               // Command/Win modifier state
  timestamp: number;              // DOMHighResTimeStamp when event occurred
  target: EventTarget | null;     // Element that received the event
  type: string;                   // Event type ('mousemove', 'mousedown', etc.)
}

/**
 * Event stored in queue awaiting delayed dispatch
 * Preserves original order via index tracking
 */
export interface QueuedEvent {
  event: KeyboardEventData | MouseEventData;  // Original event data
  originalTimestamp: number;      // When event was intercepted (ms)
  scheduledTimestamp: number;     // When event should be dispatched (ms)
  originalIndex: number;          // Sequence number for ordering
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Privacy protection levels determining delay magnitude
 * - low: 30-50ms delays (gaming-friendly)
 * - medium: 50-100ms delays (recommended default)
 * - high: 80-150ms delays (maximum obfuscation)
 */
export type PrivacyLevel = 'low' | 'medium' | 'high';

/**
 * UX IMPROVEMENT: Preset configurations for easy setup
 * Inspired by AdGuard's preset configurations
 */
export type Preset = 'gaming' | 'privacy' | 'balanced' | 'custom';

/**
 * Preset configuration interface
 */
export interface PresetConfig {
  name: string;
  description: string;
  privacyLevel: PrivacyLevel;
  advancedProtections: {
    digraphNoise: boolean;
    sessionRandomization: boolean;
    webworkerProtection: boolean;
    mlEvasion: boolean;
  };
}

/**
 * Per-site configuration overriding global defaults
 */
export interface SiteSettings {
  enabled: boolean;               // Protection active on this site
  privacyLevel: PrivacyLevel;    // Delay magnitude
  whitelisted: boolean;           // User explicitly disabled protection
}

/**
 * Global extension settings applying to all sites
 */
export interface GlobalSettings {
  defaultEnabled: boolean;        // Enable protection by default
  defaultPrivacyLevel: PrivacyLevel;
  showNotifications: boolean;     // Show tracker detection alerts
  enableContextDetection: boolean; // Auto-adjust for gaming
  customDelayMin: number;         // Override minimum delay (ms)
  customDelayMax: number;         // Override maximum delay (ms)
  stealthMode?: boolean;         // UX IMPROVEMENT: Maximum protection mode (one-click maximum protection)
  advancedProtections?: {         // Runtime-configurable advanced protection settings
    digraphNoise?: boolean;
    sessionRandomization?: boolean;
    webworkerProtection?: boolean;
    mlEvasion?: boolean;
    gaussianDistribution?: boolean;
    microJitter?: boolean;
    performanceCoarsening?: boolean;
  };
}

// ============================================
// TRACKER DETECTION TYPES
// ============================================

/**
 * Signature pattern for identifying known tracker scripts
 */
export interface TrackerSignature {
  name: string;                   // Tracker product name
  patterns: {
    scriptUrls?: string[];        // URL patterns to match
    functionNames?: string[];     // Global function identifiers
    eventListeners?: {
      type: string;               // Event type (keydown, keyup)
      minCount: number;           // Threshold for suspicion
    }[];
  };
  severity: 'low' | 'medium' | 'high';
}

/**
 * Tracker detection result stored and displayed to user
 */
export interface DetectionResult {
  name: string;                   // Tracker identifier
  type: 'signature' | 'heuristic'; // Detection method
  severity: 'low' | 'medium' | 'high';
  description: string;            // User-friendly explanation
  confidence: number;             // 0.0 - 1.0
  timestamp: number;              // When detected (ms since epoch)
  domain?: string;                // Domain where detection occurred (for filtering)
}

// ============================================
// CONTEXT DETECTION TYPES
// ============================================

/**
 * Input context determines delay adjustments
 * Gaming contexts get reduced delays for responsiveness
 */
export interface InputContext {
  isGaming: boolean;              // WebGL canvas + high frame rate
  isFormField: boolean;           // input/textarea/contenteditable
  isSearchField: boolean;         // Search input specifically
  isPasswordField: boolean;       // Password input (no adjustment)
  isTextEditor: boolean;          // Rich text editor detected
  elementType: string;            // HTML tag name
}

/**
 * Mouse movement context for adaptive obfuscation
 */
export interface MouseContext {
  isGaming: boolean;              // Gaming context (reduce noise)
  isDragging: boolean;            // User is dragging (smooth movement)
  isHovering: boolean;            // Hovering over interactive element
  velocity: number;               // Current movement velocity (pixels/ms)
  acceleration: number;           // Current acceleration (pixels/ms²)
  distance: number;               // Distance from last position
}

/**
 * Scroll context for adaptive obfuscation
 */
export interface ScrollContext {
  isReading: boolean;             // Reading mode (slow, consistent scrolling)
  isFastScroll: boolean;          // Fast scrolling (quick navigation)
  isSmoothScroll: boolean;        // Smooth scroll behavior detected
  velocity: number;               // Current scroll velocity (pixels/ms)
  direction: 'up' | 'down' | 'left' | 'right' | 'none'; // Scroll direction
  distance: number;               // Scroll distance
}

// ============================================
// MESSAGING TYPES
// ============================================

/**
 * Message types for extension internal communication
 * Service Worker <-> Content Script <-> Popup
 */
export enum MessageType {
  // Content Script -> Service Worker
  DETECTION_FOUND = 'DETECTION_FOUND',
  UPDATE_STATS = 'UPDATE_STATS',
  GET_SETTINGS = 'GET_SETTINGS',
  TRACK_EVENT = 'TRACK_EVENT',              // Track obfuscated event
  
  // Service Worker -> Content Script
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  ENABLE_PROTECTION = 'ENABLE_PROTECTION',
  DISABLE_PROTECTION = 'DISABLE_PROTECTION',
  
  // Popup -> Service Worker
  GET_CURRENT_SITE_SETTINGS = 'GET_CURRENT_SITE_SETTINGS',
  UPDATE_SITE_SETTINGS = 'UPDATE_SITE_SETTINGS',
  GET_DETECTIONS = 'GET_DETECTIONS',
  GET_STATISTICS = 'GET_STATISTICS',         // Get statistics data
  RESET_STATISTICS = 'RESET_STATISTICS',     // Reset statistics
  EXPORT_SETTINGS = 'EXPORT_SETTINGS',       // Export settings
  IMPORT_SETTINGS = 'IMPORT_SETTINGS',       // Import settings
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',       // Update global settings
  ONBOARDING_COMPLETE = 'ONBOARDING_COMPLETE', // Mark onboarding as complete
  GET_ONBOARDING_STATUS = 'GET_ONBOARDING_STATUS' // Get onboarding status
}

// ============================================
// STORAGE QUOTA TYPES
// ============================================

/**
 * Storage quota information
 * SECURITY: Used for quota management and cleanup
 */
export interface StorageQuotaInfo {
  quota: number;              // Total quota in bytes
  usage: number;              // Bytes currently in use
  available: number;          // Available bytes (quota - usage)
  usagePercent: number;       // Usage percentage (0-100)
}

/**
 * Message response type
 * SECURITY: Standardized response format
 */
export interface MessageResponse {
  success?: boolean;
  error?: string;
  [key: string]: any;         // Additional response data
}

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Statistics data tracked by the extension
 */
export interface Statistics {
  // Tracker detection
  trackersBlocked: number;          // Total trackers detected
  trackerDetections: Array<{        // Individual detections
    name: string;
    domain: string;
    timestamp: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  // Protection usage
  protectionHours: number;           // Total hours protection active
  sitesProtected: number;            // Unique sites protected
  eventsObfuscated: number;        // Total events obfuscated (keystroke + mouse + scroll)
  
  // Privacy level usage
  privacyLevelUsage: {
    low: number;                     // Hours at low privacy
    medium: number;                  // Hours at medium privacy
    high: number;                    // Hours at high privacy
  };
  
  // Performance metrics
  averageEventOverhead: number;      // Average processing time per event (ms)
  maxEventOverhead: number;          // Maximum processing time (ms)
  
  // Timestamps
  firstUse: number;                  // First use timestamp
  lastUpdate: number;                // Last statistics update
}

/**
 * Standard message envelope for all internal communication
 */
export interface Message {
  type: MessageType;
  payload?: MessagePayload;
  tabId?: number;
}

/**
 * Type-safe message payloads for each message type
 * SECURITY: Prevents type errors and improves code safety
 */
export type MessagePayload =
  | GetSettingsPayload
  | UpdateSiteSettingsPayload
  | DetectionFoundPayload
  | GetDetectionsPayload
  | TrackEventPayload
  | ExportSettingsPayload
  | ImportSettingsPayload
  | UpdateSettingsPayload
  | undefined; // Some messages have no payload

/**
 * Payload for GET_SETTINGS message
 */
export interface GetSettingsPayload {
  domain?: string;
}

/**
 * Payload for UPDATE_SITE_SETTINGS message
 */
export interface UpdateSiteSettingsPayload {
  domain: string;
  settings: SiteSettings;
}

/**
 * Payload for DETECTION_FOUND message
 */
export interface DetectionFoundPayload {
  domain: string;
  detection: DetectionResult;
}

/**
 * Payload for GET_DETECTIONS message
 */
export interface GetDetectionsPayload {
  domain?: string;
}

/**
 * Payload for TRACK_EVENT message
 */
export interface TrackEventPayload {
  eventType: 'keystroke' | 'mouse' | 'scroll' | 'pointer' | 'touch';
  processingTime: number;
}

/**
 * Payload for EXPORT_SETTINGS message
 */
export interface ExportSettingsPayload {
  includeStats?: boolean;  // Alias for includeStatistics for consistency
  includeStatistics?: boolean;  // Legacy support
}

/**
 * Payload for IMPORT_SETTINGS message
 */
export interface ImportSettingsPayload {
  data: string;
  mode?: 'merge' | 'replace';
}

/**
 * Payload for UPDATE_SETTINGS message (global settings update)
 * ENHANCEMENT: Supports advanced protection settings (v0.2.0)
 * ENHANCEMENT: Added V2 cutting-edge protections (v0.3.0)
 */
export interface UpdateSettingsPayload {
  stealthMode?: boolean;
  defaultPrivacyLevel?: PrivacyLevel;
  customDelayMin?: number;
  customDelayMax?: number;
  advancedProtections?: {
    digraphNoise?: boolean;
    sessionRandomization?: boolean;
    webworkerProtection?: boolean;
    mlEvasion?: boolean;
    gaussianDistribution?: boolean;
    microJitter?: boolean;
    performanceCoarsening?: boolean;
  };
  /**
   * V2 Cutting-edge protections (2025+)
   * Based on research: BeCAPTCHA-Mouse, BehaveFormer, DeepKey
   */
  advancedProtectionsV2?: {
    touchObfuscation?: boolean;
    deviceMotionProtection?: boolean;
    rafTimingProtection?: boolean;
    audioTimingProtection?: boolean;
    eventTimestampCoarsening?: boolean;
    interactionPatternProtection?: boolean;
    pointerEventProtection?: boolean;
  };
}
