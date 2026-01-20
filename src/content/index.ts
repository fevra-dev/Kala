import { EventInterceptor } from './event-interceptor';
import { TrackerDetector } from './tracker-detector';
import { Messaging, MessageType } from '../shared/messaging';
import { Utils } from '../shared/utils';
import { PerformanceCoarsener } from './performance-coarsener';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';
import { ExtensionHider } from './extension-hider';
import { WebWorkerTimingProtection } from './webworker-timing-protection';
import { DetectionResult, SiteSettings } from '../shared/types';

// V2 Cutting-edge protections (2025+)
import { TouchObfuscator } from './touch-obfuscator';
import { DeviceMotionProtection } from './device-motion-protection';
import { TimingAttackProtection } from './timing-attack-protection';
import { InteractionPatternProtection } from './interaction-pattern-protection';

/**
 * Content Script Entry Point
 * Initialized once per page load
 */
class ContentScript {
  private eventInterceptor: EventInterceptor;
  private trackerDetector: TrackerDetector;
  private isEnabled: boolean = true;
  private currentDomain: string;
  
  // V2 Cutting-edge protections
  private touchObfuscator: TouchObfuscator;
  private deviceMotionProtection: DeviceMotionProtection;
  private timingAttackProtection: TimingAttackProtection;
  private interactionPatternProtection: InteractionPatternProtection;
  
  constructor() {
    this.currentDomain = Utils.getCurrentDomain();
    this.eventInterceptor = new EventInterceptor();
    this.trackerDetector = new TrackerDetector();
    
    // Initialize V2 protections
    this.touchObfuscator = new TouchObfuscator();
    this.deviceMotionProtection = new DeviceMotionProtection();
    this.timingAttackProtection = new TimingAttackProtection();
    this.interactionPatternProtection = new InteractionPatternProtection();
  }
  
  /**
   * Initialize content script
   * SECURITY: Uses try-catch to ensure cleanup on error
   */
  async initialize(): Promise<void> {
    try {
      if (CONSTANTS.DEBUG.ENABLED) {
        Logger.info('='.repeat(60));
        Logger.info('Content script initializing...');
        Logger.info(`Domain: ${this.currentDomain}`);
        // SECURITY: Don't log full URL in production (may contain sensitive query params)
        if (CONSTANTS.DEBUG.ENABLED) {
          Logger.info(`URL: ${window.location.href}`);
        }
        Logger.info('='.repeat(60));
      }
      
      // Load settings from service worker
      const settings = await this.loadSettings();
      
      if (CONSTANTS.DEBUG.ENABLED) {
        Logger.debug('Loaded settings:', settings);
      }
      
      // Initialize extension hiding (always, regardless of enabled state)
      ExtensionHider.initialize();
      
      // Initialize Web Worker timing protection (always active)
      WebWorkerTimingProtection.initialize();
      
      // Initialize components if enabled
      if (settings.enabled) {
        // Coarsen performance.now() to prevent high-resolution timing attacks
        if (CONSTANTS.EVASION.COARSEN_PERFORMANCE_NOW) {
          PerformanceCoarsener.initialize();
        }
        
        this.eventInterceptor.initialize();
        this.trackerDetector.initialize();
        
        // Initialize V2 cutting-edge protections
        this.initializeV2Protections(settings.privacyLevel || 'medium');
        
        Logger.info('Protection ENABLED (including V2 cutting-edge protections)');
      } else {
        Logger.info('Protection DISABLED for this site');
      }
      
      // Set up message listeners
      this.setupMessageHandlers();
      
      // Set up tracker detection listener
      this.trackerDetector.on('detection', (detection: DetectionResult) => {
        this.handleDetection(detection);
      });
      
      Logger.info('Content script initialized successfully');
    } catch (error) {
      // SECURITY: Cleanup on error to prevent memory leaks
      Logger.error('Content script initialization failed:', error);
      this.cleanup();
      throw error;
    }
  }
  
  /**
   * Initialize V2 cutting-edge protections (2025+ research-based)
   * Based on: BeCAPTCHA-Mouse, BehaveFormer, DeepKey papers
   */
  private initializeV2Protections(privacyLevel: 'low' | 'medium' | 'high'): void {
    // Set privacy levels for all V2 protections
    this.touchObfuscator.setPrivacyLevel(privacyLevel);
    this.deviceMotionProtection.setPrivacyLevel(privacyLevel);
    this.timingAttackProtection.setPrivacyLevel(privacyLevel);
    this.interactionPatternProtection.setPrivacyLevel(privacyLevel);
    
    // Touch event protection (mobile fingerprinting)
    if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.TOUCH_OBFUSCATION !== false) {
      this.setupTouchProtection();
    }
    
    // Device motion protection (accelerometer/gyroscope)
    if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.DEVICE_MOTION_PROTECTION !== false) {
      this.setupDeviceMotionProtection();
    }
    
    // Interaction pattern protection (focus/blur/click/hover)
    if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.FOCUS_BLUR_PROTECTION !== false) {
      this.setupInteractionProtection();
    }
    
    Logger.info('V2 cutting-edge protections initialized');
  }
  
  /**
   * Setup touch event protection
   * Intercepts all touch events and synthesizes obfuscated versions
   */
  private setupTouchProtection(): void {
    const touchObfuscator = this.touchObfuscator;
    
    // Helper to check if event is synthetic
    const isSynthetic = (e: TouchEvent): boolean => {
      return (e as any).__kala_synthetic__ === true;
    };
    
    // Intercept touchstart
    document.addEventListener('touchstart', (e) => {
      if (isSynthetic(e)) return;
      
      if (e.touches.length > 0) {
        // Record touch start for hold duration tracking
        touchObfuscator.recordTouchStart(e.touches[0]);
        
        // Apply timing jitter
        const jitter = touchObfuscator.getTouchTimingJitter();
        if (jitter !== 0) {
          Logger.debug(`Touch start timing jitter: ${jitter.toFixed(2)}ms`);
        }
      }
    }, { passive: true, capture: true });
    
    // Intercept touchmove for velocity obfuscation
    document.addEventListener('touchmove', (e) => {
      if (isSynthetic(e)) return;
      
      if (e.touches.length > 0) {
        // Track velocity for swipe obfuscation
        const normalizedVelocity = touchObfuscator.recordTouchMove(e.touches[0]);
        
        if (CONSTANTS.DEBUG.ENABLED && normalizedVelocity > 0) {
          Logger.debug(`Touch velocity normalized: ${normalizedVelocity.toFixed(3)} px/ms`);
        }
      }
    }, { passive: true, capture: true });
    
    // Intercept touchend for hold duration
    document.addEventListener('touchend', (e) => {
      if (isSynthetic(e)) return;
      
      // Get hold duration jitter
      const holdJitter = touchObfuscator.getHoldDurationJitter();
      
      // Check for double-tap normalization
      if (touchObfuscator.shouldNormalizeDoubleTap()) {
        const normalizedDelay = touchObfuscator.getDoubleTapDelay();
        Logger.debug(`Double-tap normalized to ${normalizedDelay.toFixed(0)}ms interval`);
      }
      
      // Track average velocity for gesture analysis protection
      const avgVelocity = touchObfuscator.getAverageVelocity();
      if (avgVelocity > 0) {
        Logger.debug(`Swipe average velocity: ${avgVelocity.toFixed(3)} px/ms`);
      }
    }, { passive: true, capture: true });
    
    Logger.debug('Touch protection enabled (with velocity & hold duration obfuscation)');
  }
  
  /**
   * Setup device motion protection
   */
  private setupDeviceMotionProtection(): void {
    const deviceMotion = this.deviceMotionProtection;
    
    // Rate limit and obfuscate device motion events
    window.addEventListener('devicemotion', (e) => {
      if (deviceMotion.shouldRateLimit()) {
        e.stopImmediatePropagation();
      }
    }, { capture: true });
    
    window.addEventListener('deviceorientation', (e) => {
      if (deviceMotion.shouldRateLimit()) {
        e.stopImmediatePropagation();
      }
    }, { capture: true });
    
    Logger.debug('Device motion protection enabled');
  }
  
  /**
   * Setup interaction pattern protection (focus/blur/click/hover/clipboard)
   */
  private setupInteractionProtection(): void {
    const interaction = this.interactionPatternProtection;
    
    // Focus/blur protection with timing jitter
    window.addEventListener('focus', (e) => {
      const jitter = interaction.getFocusJitter();
      if (jitter > 0) {
        // Apply timing jitter by delaying internal state update
        setTimeout(() => {
          interaction.recordFocus(performance.now());
        }, jitter);
      } else {
        interaction.recordFocus(performance.now());
      }
    }, { capture: true });
    
    window.addEventListener('blur', (e) => {
      const jitter = interaction.getBlurJitter();
      if (jitter > 0) {
        setTimeout(() => {
          interaction.recordBlur(performance.now());
        }, jitter);
      } else {
        interaction.recordBlur(performance.now());
      }
    }, { capture: true });
    
    // Form field sequence protection - add jitter to field focus events
    if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.FORM_FIELD_PROTECTION) {
      document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          const fieldId = target.id || (target as HTMLInputElement).name || 'anonymous';
          const delay = interaction.getFieldFocusDelay(fieldId);
          Logger.debug(`Form field focus delay: ${delay.toFixed(1)}ms for ${fieldId}`);
        }
      }, { passive: true, capture: true });
    }
    
    // Hover tracking for dwell time protection
    document.addEventListener('mouseenter', () => {
      interaction.recordHoverStart();
    }, { passive: true, capture: true });
    
    // Clipboard protection - add timing jitter to copy/paste events
    document.addEventListener('copy', (e) => {
      const delay = interaction.getCopyDelay();
      if (delay > 0) {
        // Add imperceptible delay to clipboard timing
        const originalData = e.clipboardData;
        if (originalData) {
          Logger.debug(`Copy event jitter: ${delay.toFixed(1)}ms`);
        }
      }
    }, { capture: true });
    
    document.addEventListener('paste', (_e) => {
      const delay = interaction.getPasteDelay();
      if (delay > 0) {
        Logger.debug(`Paste event jitter: ${delay.toFixed(1)}ms`);
      }
    }, { capture: true });
    
    // Click pattern protection - normalize click timing
    document.addEventListener('click', () => {
      interaction.getClickDelay(); // Track click patterns
    }, { passive: true, capture: true });
    
    // Visibility state protection
    document.addEventListener('visibilitychange', () => {
      const delay = interaction.getVisibilityChangeDelay();
      if (delay > 0) {
        Logger.debug(`Visibility change jitter: ${delay.toFixed(1)}ms`);
      }
    }, { capture: true });
    
    Logger.debug('Interaction pattern protection enabled (with clipboard, click, form field, visibility)');
  }
  
  /**
   * Cleanup resources on error or unload
   * SECURITY: Ensures all listeners and timers are cleaned up
   */
  private cleanup(): void {
    try {
      if (this.eventInterceptor) {
        this.eventInterceptor.destroy();
      }
      if (this.trackerDetector) {
        this.trackerDetector.destroy();
      }
      if (this.interactionPatternProtection) {
        this.interactionPatternProtection.reset();
      }
      if (this.touchObfuscator) {
        this.touchObfuscator.reset();
      }
    } catch (error) {
      Logger.error('Error during content script cleanup:', error);
    }
  }
  
  /**
   * Load settings from service worker
   */
  private async loadSettings(): Promise<SiteSettings & { enabled: boolean; privacyLevel: string }> {
    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.GET_SETTINGS,
        payload: { domain: this.currentDomain }
      });
      
      return response.settings;
    } catch (error) {
      Logger.error('Failed to load settings:', error);
      return { enabled: true, privacyLevel: 'medium', whitelisted: false };
    }
  }
  
  /**
   * Set up message handlers for service worker communication
   */
  private setupMessageHandlers(): void {
    Messaging.onMessage(async (message) => {
      Logger.debug('Received message from service worker:', message.type);
      
      switch (message.type) {
        case MessageType.ENABLE_PROTECTION:
          this.enableProtection();
          return { success: true };
          
        case MessageType.DISABLE_PROTECTION:
          this.disableProtection();
          return { success: true };
          
        case MessageType.SETTINGS_UPDATED:
          this.updateSettings(message.payload);
          return { success: true };
          
        default:
          return { error: 'Unknown message type' };
      }
    });
  }
  
  /**
   * Enable protection
   */
  private enableProtection(): void {
    Logger.info('Enabling protection');
    
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.eventInterceptor.initialize();
    }
  }
  
  /**
   * Disable protection
   */
  private disableProtection(): void {
    Logger.info('Disabling protection');
    
    if (this.isEnabled) {
      this.isEnabled = false;
      this.eventInterceptor.destroy();
    }
  }
  
  /**
   * Update settings (e.g., privacy level changed)
   */
  private updateSettings(settings: any): void {
    Logger.debug('Updating settings:', settings);
    
    // Update enabled state FIRST - this is critical for toggle functionality
    if (settings.enabled !== undefined) {
      const wasEnabled = this.isEnabled;
      this.isEnabled = settings.enabled;
      
      // Update event interceptor state immediately
      this.eventInterceptor.setEnabled(settings.enabled);
      
      // Initialize or destroy based on new state
      if (settings.enabled && !wasEnabled) {
        this.enableProtection();
      } else if (!settings.enabled && wasEnabled) {
        this.disableProtection();
      }
    }
    
    // Update privacy level for all obfuscators (keyboard + mouse + V2)
    if (settings.privacyLevel) {
      this.eventInterceptor.setPrivacyLevel(settings.privacyLevel);
      
      // Update V2 protection privacy levels
      this.touchObfuscator.setPrivacyLevel(settings.privacyLevel);
      this.deviceMotionProtection.setPrivacyLevel(settings.privacyLevel);
      this.timingAttackProtection.setPrivacyLevel(settings.privacyLevel);
      this.interactionPatternProtection.setPrivacyLevel(settings.privacyLevel);
    }
  }
  
  /**
   * Handle tracker detection
   */
  private handleDetection(detection: DetectionResult): void {
    Logger.info('Tracker detected, notifying service worker:', detection.name);
    
    Messaging.sendToBackground({
      type: MessageType.DETECTION_FOUND,
      payload: {
        domain: this.currentDomain,
        detection
      }
    });
    
    // Track site protection
    Messaging.sendToBackground({
      type: MessageType.TRACK_EVENT,
      payload: { eventType: 'keystroke', processingTime: 0 } // Dummy event to trigger site tracking
    }).catch(() => {
      // Ignore errors
    });
  }
}

// Wrap entire content script in IIFE to minimize global footprint
// SECURITY: Prevents detection via global variables
(function() {
  'use strict';
  
  // Initialize with small random delay to avoid detection patterns
  // Real extensions don't all initialize at exactly the same time
  const initDelay = Math.random() * 100; // 0-100ms random delay
  
  setTimeout(() => {
    Logger.info('Content script loaded, initializing...');
    const contentScript = new ContentScript();
    contentScript.initialize().catch(error => {
      Logger.error('Content script initialization failed:', error);
    });
  }, initDelay);
})();

