import { KeyboardEventData, PrivacyLevel } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { EventQueue } from './event-queue';
import { DelayCalculator } from './delay-calculator';
import { EventSynthesizer } from './event-synthesizer';
import { ContextDetector } from './context-detector';
import { MouseObfuscator } from './mouse-obfuscator';
import { ScrollObfuscator } from './scroll-obfuscator';
import { Logger } from '../shared/logger';
import { isSyntheticEvent } from './extension-hider';
import { Messaging, MessageType } from '../shared/messaging';
import { PerformanceMonitor } from '../shared/performance-monitor';
import { ErrorHandler } from '../shared/error-handler';
import { FlightTimeCorrelator } from './flight-time-correlator';
import { PointerObfuscator } from './pointer-obfuscator';

/**
 * STATE DIAGRAM:
 * 
 * [Native Event] 
 *      ↓
 * [Intercept at Capture Phase] ← stopImmediatePropagation()
 *      ↓
 * [Clone Event Data]
 *      ↓
 * [Calculate Context-Aware Delay]
 *      ↓
 * [Enqueue with Timestamp]
 *      ↓
 * [Wait for Scheduled Time]
 *      ↓
 * [Synthesize & Dispatch New Event]
 *      ↓
 * [Event Reaches Page Scripts] ← appears normal to trackers
 */
export class EventInterceptor {
  private enabled: boolean = true;
  private eventQueue: EventQueue;
  private delayCalculator: DelayCalculator;
  private eventSynthesizer: EventSynthesizer;
  private contextDetector: ContextDetector;
  private mouseObfuscator: MouseObfuscator;
  private scrollObfuscator: ScrollObfuscator;
  private flightTimeCorrelator: FlightTimeCorrelator;
  private pointerObfuscator: PointerObfuscator;
  private lastKey: string | null = null;  // Track previous key for word-boundary detection
  private lastMousePosition: { x: number; y: number } | null = null;
  private lastMouseTimestamp: number = 0;
  private lastScrollPosition: { x: number; y: number } = { x: 0, y: 0 };
  // Track pending keydown dispatch times for flight time correlation
  private pendingKeydownTimes: Map<string, number> = new Map();
  
  constructor() {
    this.eventQueue = new EventQueue();
    this.delayCalculator = new DelayCalculator();
    this.eventSynthesizer = new EventSynthesizer();
    this.contextDetector = new ContextDetector();
    this.mouseObfuscator = new MouseObfuscator();
    this.scrollObfuscator = new ScrollObfuscator();
    this.flightTimeCorrelator = new FlightTimeCorrelator();
    this.pointerObfuscator = new PointerObfuscator();
  }
  
  /**
   * Initialize event listeners
   * Called once when content script loads
   */
  /**
   * Initialize event listeners
   * SECURITY: Uses try-finally to ensure cleanup on error
   */
  initialize(): void {
    let listenersAdded = false;
    
    try {
      Logger.info('Initializing event interceptor');
      
      // CRITICAL: Use capture phase to run before page scripts
      // passive: false allows preventDefault()
      document.addEventListener('keydown', this.handleKeydown, {
        capture: true,
        passive: false
      });
      
      document.addEventListener('keyup', this.handleKeyup, {
        capture: true,
        passive: false
      });
      
      listenersAdded = true;
      
      // Mouse movement obfuscation
      if (CONSTANTS.MOUSE.ENABLED) {
        document.addEventListener('mousemove', this.handleMousemove, {
          capture: true,
          passive: false
        });
        
        Logger.info('Mouse obfuscation enabled');
      }
      
      // Scroll pattern tracking (passive - no blocking)
      if (CONSTANTS.SCROLL.ENABLED) {
        // Track scroll events passively - don't block native behavior
        document.addEventListener('wheel', this.handleWheel, {
          capture: true,
          passive: true  // CRITICAL: passive=true so we don't block scrolling
        });
        
        // Also track scroll events for compatibility
        window.addEventListener('scroll', this.handleScroll, {
          capture: true,
          passive: true  // CRITICAL: passive=true so we don't block scrolling
        });
        
        Logger.info('Scroll tracking enabled (passive mode)');
      }
      
      // Pointer event obfuscation (unified mouse/touch/pen handling)
      if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.POINTER_EVENT_PROTECTION) {
        document.addEventListener('pointermove', this.handlePointermove, {
          capture: true,
          passive: false
        });
        
        Logger.info('Pointer event protection enabled');
      }
      
      Logger.info('Event interceptor initialized');
    } catch (error) {
      // SECURITY: Cleanup on error to prevent memory leaks
      Logger.error('Error initializing event interceptor:', error);
      if (listenersAdded) {
        this.destroy();
      }
      throw error;
    }
  }
  
  /**
   * Check if a key should be excluded from obfuscation
   * Navigation keys, function keys, and system keys should pass through normally
   */
  private shouldExcludeKey(key: string, code: string, event: KeyboardEvent): boolean {
    // Navigation keys - essential for browser/OS functionality
    const navigationKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Tab', 'Escape'
    ];
    
    // Function keys - system shortcuts
    const functionKeys = [
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    // System modifier combinations - let browser handle
    if (key.startsWith('Meta') || key.startsWith('OS') || code.startsWith('Meta') || code.startsWith('OS')) {
      return true;
    }
    
    // CRITICAL: Allow system shortcuts like Cmd+C, Cmd+V, Ctrl+C, Ctrl+V, etc.
    // These should pass through to the browser for copy/paste/undo/etc.
    if (event.metaKey || event.ctrlKey) {
      return true;
    }
    
    return navigationKeys.includes(key) || functionKeys.includes(key);
  }

  /**
   * Handle keydown event
   * 
   * INPUT: Native KeyboardEvent from browser
   * OUTPUT: Event queued for delayed dispatch
   * 
   * FLOW:
   * 1. Check if protection enabled
   * 2. Check if event is synthetic (prevent infinite loop)
   * 3. Check if key should be excluded (navigation keys, etc.)
   * 4. Stop propagation to page scripts
   * 5. Clone event data
   * 6. Get input context (gaming? form field?)
   * 7. Calculate delay based on context and privacy level
   * 8. Queue event with callback to synthesize later
   */
  private handleKeydown = (event: KeyboardEvent): void => {
    // Early exit if disabled or synthetic
    if (!this.enabled || this.isSyntheticEvent(event)) {
      return;
    }
    
    // CRITICAL: Exclude navigation and system keys - let them pass through normally
    if (this.shouldExcludeKey(event.key, event.code, event)) {
      return;
    }
    
    // EFFICIENCY: Lazy evaluation for debug logs (only evaluated if DEBUG enabled)
    if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
      Logger.debug(() => `Intercepted keydown: ${event.key}`);
    } else if (CONSTANTS.DEBUG.ENABLED) {
      Logger.info('Intercepted keydown event');
    }
    
    // CRITICAL: Stop event from reaching page scripts (only for keys we're obfuscating)
    event.stopImmediatePropagation();
    event.preventDefault();
    
    // Clone all event properties
    const eventData = this.cloneEvent(event);
    
    // Determine input context for adaptive delays
    const context = this.contextDetector.getInputContext(
      event.target as HTMLElement
    );
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Context: gaming=${context.isGaming}, formField=${context.isFormField}, elementType=${context.elementType}`);
    }
    
    // Calculate obfuscation delay (with word-boundary detection)
    const delay = this.delayCalculator.calculateDelay(
      context,
      this.lastKey || undefined,
      eventData.key
    );
    
    // Update last key for next keystroke
    this.lastKey = eventData.key;
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Calculated delay: ${delay}ms`);
    }
    
    // Record keydown for flight time correlation
    if (CONSTANTS.EVASION.FLIGHT_TIME_CORRELATION) {
      this.flightTimeCorrelator.recordKeydown(eventData.key, delay);
    }
    
    // Queue for delayed dispatch
    const startTime = performance.now();
    this.eventQueue.enqueue(eventData, delay, (data) => {
      try {
        // EFFICIENCY: Lazy evaluation for debug logs
        if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
          Logger.debug(() => `Dispatching delayed keydown: ${data.key}`);
        } else if (CONSTANTS.DEBUG.ENABLED) {
          Logger.info('Dispatching delayed keydown event');
        }
        this.eventSynthesizer.synthesizeAndDispatch(data, event.target, 'keydown');
        
        // Track keydown dispatch time for flight time correlation
        this.pendingKeydownTimes.set(data.key, performance.now());
        
        // Track performance
        const processingTime = performance.now() - startTime;
        PerformanceMonitor.trackEvent('keystroke', processingTime);
        
        // Track event for statistics
        Messaging.sendToBackground({
          type: MessageType.TRACK_EVENT,
          payload: { eventType: 'keystroke', processingTime }
        }).catch((error) => {
          ErrorHandler.handleError(error, 'event-interceptor:statistics', true);
        });
      } catch (error) {
        ErrorHandler.handleError(error, 'event-interceptor:keydown', true);
      }
    });
  };
  
  /**
   * Handle keyup event
   * Uses flight time correlation for realistic keydown/keyup timing
   */
  private handleKeyup = (event: KeyboardEvent): void => {
    if (!this.enabled || this.isSyntheticEvent(event)) {
      return;
    }
    
    // CRITICAL: Exclude navigation and system keys - let them pass through normally
    if (this.shouldExcludeKey(event.key, event.code, event)) {
      return;
    }
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
      Logger.debug(() => `Intercepted keyup: ${event.key}`);
    } else if (CONSTANTS.DEBUG.ENABLED) {
      Logger.info('Intercepted keyup event');
    }
    
    event.stopImmediatePropagation();
    event.preventDefault();
    
    const eventData = this.cloneEvent(event);
    const context = this.contextDetector.getInputContext(
      event.target as HTMLElement
    );
    
    // Use flight time correlation for keyup delay if enabled
    let delay: number;
    if (CONSTANTS.EVASION.FLIGHT_TIME_CORRELATION) {
      const keydownDispatchTime = this.pendingKeydownTimes.get(eventData.key) || performance.now();
      delay = this.flightTimeCorrelator.getKeyupDelay(eventData.key, keydownDispatchTime);
      this.pendingKeydownTimes.delete(eventData.key);
    } else {
      // Fallback: Calculate delay normally
      delay = this.delayCalculator.calculateDelay(
        context,
        this.lastKey || undefined,
        eventData.key
      );
    }
    
    this.eventQueue.enqueue(eventData, delay, (data) => {
      // EFFICIENCY: Lazy evaluation for debug logs
      if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
        Logger.debug(() => `Dispatching delayed keyup: ${data.key}`);
      } else if (CONSTANTS.DEBUG.ENABLED) {
        Logger.info('Dispatching delayed keyup event');
      }
      this.eventSynthesizer.synthesizeAndDispatch(data, event.target, 'keyup');
    });
  };
  
  /**
   * Clone all keyboard event properties
   * CRITICAL: Must preserve exact values for synthetic event
   * 
   * INPUT: Native KeyboardEvent object
   * OUTPUT: Plain object with all properties
   */
  private cloneEvent(original: KeyboardEvent): KeyboardEventData {
    return {
      key: original.key,
      code: original.code,
      keyCode: original.keyCode,
      which: original.which,
      charCode: original.charCode,
      location: original.location,
      repeat: original.repeat,
      ctrlKey: original.ctrlKey,
      shiftKey: original.shiftKey,
      altKey: original.altKey,
      metaKey: original.metaKey,
      timestamp: original.timeStamp,
      target: original.target
    };
  }
  
  /**
   * Check if event is synthetic to prevent re-interception
   * Synthetic events have special marker property
   */
  private isSyntheticEvent(event: Event): boolean {
    return isSyntheticEvent(event);
  }
  
  /**
   * Handle mousemove event for obfuscation
   * 
   * FLOW:
   * 1. Check if protection enabled
   * 2. Check if event is synthetic (prevent infinite loop)
   * 3. Stop propagation to page scripts
   * 4. Get mouse context
   * 5. Obfuscate coordinates and movement
   * 6. Dispatch obfuscated event immediately (no delay for mouse)
   */
  private handleMousemove = (event: MouseEvent): void => {
    if (!this.enabled || !CONSTANTS.MOUSE.ENABLED || this.isSyntheticEvent(event)) {
      return;
    }
    
    // Get mouse context for adaptive obfuscation
    const mouseContext = this.contextDetector.getMouseContext(
      event,
      this.lastMousePosition,
      this.lastMouseTimestamp
    );
    
    // Obfuscate mouse event
    const obfuscatedEvent = this.mouseObfuscator.obfuscateMouseEvent(event, mouseContext);
    
    // Update tracking state
    this.lastMousePosition = { x: obfuscatedEvent.clientX, y: obfuscatedEvent.clientY };
    this.lastMouseTimestamp = obfuscatedEvent.timestamp;
    
    // Stop original event
    event.stopImmediatePropagation();
    event.preventDefault();
    
    // Check for micro-pause
    if (this.mouseObfuscator.shouldAddPause()) {
      const pauseDuration = this.mouseObfuscator.getPauseDuration();
      setTimeout(() => {
        this.eventSynthesizer.synthesizeAndDispatchMouse(obfuscatedEvent, event.target);
      }, pauseDuration);
    } else {
      // Dispatch immediately (mouse events need low latency)
      const startTime = performance.now();
      try {
        this.eventSynthesizer.synthesizeAndDispatchMouse(obfuscatedEvent, event.target);
        
        // Track performance
        const processingTime = performance.now() - startTime;
        PerformanceMonitor.trackEvent('mouse', processingTime);
        
        // Track event for statistics
        Messaging.sendToBackground({
          type: MessageType.TRACK_EVENT,
          payload: { eventType: 'mouse', processingTime }
        }).catch((error) => {
          ErrorHandler.handleError(error, 'event-interceptor:statistics', true);
        });
      } catch (error) {
        ErrorHandler.handleError(error, 'event-interceptor:mousemove', true);
      }
    }
  };
  
  /**
   * Handle wheel event (primary scroll event)
   * 
   * NOTE: We do NOT block scroll events as this breaks scrolling on many sites.
   * Instead, we just track for statistics and let the native scroll happen.
   * Scroll obfuscation is passive - we don't modify the actual scroll behavior.
   */
  private handleWheel = (event: WheelEvent): void => {
    if (!this.enabled || !CONSTANTS.SCROLL.ENABLED || this.isSyntheticEvent(event)) {
      return;
    }
    
    // Get current scroll position
    const currentScrollX = window.scrollX || window.pageXOffset || 0;
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    
    // Update scroll position tracking (passive - no blocking)
    this.scrollObfuscator.updateScrollPosition(currentScrollX, currentScrollY);
    this.lastScrollPosition = { x: currentScrollX, y: currentScrollY };
    this.lastMouseTimestamp = performance.now();
    
    // Track event for statistics (non-blocking)
    const startTime = performance.now();
    const processingTime = performance.now() - startTime;
    PerformanceMonitor.trackEvent('scroll', processingTime);
    
    Messaging.sendToBackground({
      type: MessageType.TRACK_EVENT,
      payload: { eventType: 'scroll', processingTime }
    }).catch((error) => {
      ErrorHandler.handleError(error, 'event-interceptor:statistics', true);
    });
    
    // LET THE EVENT PASS THROUGH - do NOT call preventDefault() or stopPropagation()
    // This ensures native scrolling works on all sites
  };
  
  /**
   * Handle scroll event (fallback for sites that don't use wheel events)
   * Note: Scroll events fire after scrolling, so we can't prevent them
   * But we can track patterns for future obfuscation
   */
  private handleScroll = (_event: Event): void => {
    // Scroll events are fired after scrolling happens, so we can't prevent them
    // But we can still track patterns for future obfuscation
    if (!this.enabled || !CONSTANTS.SCROLL.ENABLED) {
      return;
    }
    
    const currentScrollX = window.scrollX || window.pageXOffset || 0;
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    
    const scrollDelta = {
      x: currentScrollX - this.lastScrollPosition.x,
      y: currentScrollY - this.lastScrollPosition.y
    };
    
    // Update tracking (for pattern detection)
    this.scrollObfuscator.updateScrollPosition(currentScrollX, currentScrollY);
    this.lastScrollPosition = { x: currentScrollX, y: currentScrollY };
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Scroll event tracked: ${JSON.stringify(scrollDelta)}`);
    }
  };
  
  /**
   * Handle pointer move events (unified mouse/touch/pen)
   * Obfuscates pressure, tilt, and contact geometry
   */
  private handlePointermove = (event: PointerEvent): void => {
    if (!this.enabled || this.isSyntheticEvent(event)) {
      return;
    }
    
    // Only process non-mouse pointer events (touch/pen) fully
    // Mouse events are handled by handleMousemove
    if (event.pointerType === 'mouse') {
      return;
    }
    
    // Obfuscate pointer event
    const obfuscatedData = this.pointerObfuscator.obfuscatePointerEvent(event);
    
    // Stop original and dispatch obfuscated
    event.stopImmediatePropagation();
    event.preventDefault();
    
    // Synthesize and dispatch obfuscated pointer event
    const syntheticEvent = new PointerEvent(event.type, {
      clientX: obfuscatedData.clientX,
      clientY: obfuscatedData.clientY,
      screenX: obfuscatedData.screenX,
      screenY: obfuscatedData.screenY,
      width: obfuscatedData.width,
      height: obfuscatedData.height,
      pressure: obfuscatedData.pressure,
      tangentialPressure: obfuscatedData.tangentialPressure,
      tiltX: obfuscatedData.tiltX,
      tiltY: obfuscatedData.tiltY,
      twist: obfuscatedData.twist,
      pointerType: obfuscatedData.pointerType,
      pointerId: obfuscatedData.pointerId,
      isPrimary: obfuscatedData.isPrimary,
      bubbles: true,
      cancelable: true
    });
    
    // Mark as synthetic to prevent re-interception
    Object.defineProperty(syntheticEvent, '__kala_synthetic__', { value: true });
    
    (event.target as Element)?.dispatchEvent(syntheticEvent);
    
    // Track performance
    PerformanceMonitor.trackEvent('pointer', 0);
  };
  
  /**
   * Enable/disable protection dynamically
   * Called when user toggles in popup
   */
  setEnabled(enabled: boolean): void {
    Logger.info(`Protection ${enabled ? 'enabled' : 'disabled'}`);
    this.enabled = enabled;
    
    if (!enabled) {
      // Clear queue when disabling to prevent delayed events
      this.eventQueue.clear();
      this.mouseObfuscator.reset();
      this.scrollObfuscator.reset();
    }
  }
  
  /**
   * Get delay calculator for privacy level updates
   */
  getDelayCalculator(): DelayCalculator {
    return this.delayCalculator;
  }
  
  /**
   * Update privacy level for all obfuscators
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.delayCalculator.setPrivacyLevel(level);
    this.mouseObfuscator.setPrivacyLevel(level);
    this.scrollObfuscator.setPrivacyLevel(level);
    this.flightTimeCorrelator.setPrivacyLevel(level);
    this.pointerObfuscator.setPrivacyLevel(level);
  }
  
  /**
   * Cleanup when content script unloads
   * SECURITY: Uses try-finally to ensure cleanup completes
   */
  destroy(): void {
    Logger.info('Destroying event interceptor');
    
    try {
      document.removeEventListener('keydown', this.handleKeydown, { capture: true });
      document.removeEventListener('keyup', this.handleKeyup, { capture: true });
      
      if (CONSTANTS.MOUSE.ENABLED) {
        document.removeEventListener('mousemove', this.handleMousemove, { capture: true });
        this.mouseObfuscator.reset();
      }
      
      if (CONSTANTS.SCROLL.ENABLED) {
        document.removeEventListener('wheel', this.handleWheel, { capture: true });
        window.removeEventListener('scroll', this.handleScroll, { capture: true });
        this.scrollObfuscator.reset();
      }
      
      if (CONSTANTS.ADVANCED_PROTECTIONS_V2?.POINTER_EVENT_PROTECTION) {
        document.removeEventListener('pointermove', this.handlePointermove, { capture: true });
        this.pointerObfuscator.reset();
      }
      
      // Reset new modules
      this.flightTimeCorrelator.reset();
      this.pendingKeydownTimes.clear();
      
      this.eventQueue.clear();
    } catch (error) {
      Logger.error('Error during cleanup:', error);
    } finally {
      // SECURITY: Ensure state is reset even if cleanup fails
      this.enabled = false;
      Logger.info('Event interceptor destroyed');
    }
  }
}

