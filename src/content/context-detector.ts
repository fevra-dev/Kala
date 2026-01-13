import { InputContext, MouseContext, ScrollContext } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Detects input context for adaptive delay calculation
 * 
 * DETECTION METHODS:
 * 1. Gaming: WebGL canvas + high animation frame rate + gamepad API
 * 2. Form fields: input/textarea/contenteditable elements
 * 3. Search fields: input[type="search"] or name/placeholder contains "search"
 * 4. Password fields: input[type="password"]
 * 5. Text editors: contenteditable with editor class/attribute
 */
export class ContextDetector {
  private animationFrameRequestRate: number = 0;
  private frameCountStartTime: number = Date.now();
  // EFFICIENCY: Cache context per element to avoid redundant computation
  private contextCache = new WeakMap<HTMLElement, InputContext>();
  // EFFICIENCY: Cache mouse context per element + position hash
  private mouseContextCache = new WeakMap<HTMLElement, Map<string, MouseContext>>();
  
  constructor() {
    // Start monitoring animation frame rate
    this.monitorAnimationFrameRate();
  }
  
  /**
   * Get input context for an element
   * 
   * INPUT: HTML element that received keyboard event
   * OUTPUT: Context object with boolean flags
   * 
   * EFFICIENCY: Caches context per element to avoid redundant computation
   */
  getInputContext(element: HTMLElement): InputContext {
    // Check cache first (WeakMap for automatic garbage collection)
    if (this.contextCache.has(element)) {
      return this.contextCache.get(element)!;
    }
    
    const context: InputContext = {
      isGaming: this.isGamingContext(),
      isFormField: this.isFormField(element),
      isSearchField: this.isSearchField(element),
      isPasswordField: this.isPasswordField(element),
      isTextEditor: this.isTextEditor(element),
      elementType: element.tagName.toLowerCase()
    };
    
    // Cache for future use
    this.contextCache.set(element, context);
    
    // Only log context details if debug mode enabled
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Detected context:', context);
    }
    
    return context;
  }
  
  /**
   * Detect gaming context using multiple signals
   * 
   * HEURISTICS:
   * - Game engines (Phaser, THREE.js, Unity, Babylon)
   * - High animation frame rate (>30 FPS)
   * - Gamepad API usage
   * - WebGL canvas elements
   */
  private isGamingContext(): boolean {
    return (
      this.hasGameEngine() ||
      this.hasHighFrameRate() ||
      this.hasGamepadAPI() ||
      this.hasWebGLCanvas()
    );
  }
  
  /**
   * Check for common game engine globals
   */
  private hasGameEngine(): boolean {
    const win = window as any;
    return !!(
      win.Phaser ||      // Phaser.js
      win.BABYLON ||     // Babylon.js
      win.THREE ||       // Three.js
      win.Unity ||       // Unity WebGL
      win.Unreal         // Unreal Engine
    );
  }
  
  /**
   * Check if animation frame rate is high (gaming pattern)
   * Games typically maintain 30-60 FPS
   */
  private hasHighFrameRate(): boolean {
    return this.animationFrameRequestRate > 30;
  }
  
  /**
   * Check for Gamepad API usage
   * Chrome API: navigator.getGamepads()
   */
  private hasGamepadAPI(): boolean {
    return navigator.getGamepads !== undefined;
  }
  
  /**
   * Check for WebGL canvas elements
   * Games typically use WebGL for 3D rendering
   */
  private hasWebGLCanvas(): boolean {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    
    for (const canvas of canvases) {
      try {
        const context = canvas.getContext('webgl') || 
                       canvas.getContext('webgl2');
        if (context) {
          return true;
        }
      } catch {
        // Ignore errors from getContext()
      }
    }
    
    return false;
  }
  
  /**
   * Check if element is a form input field
   */
  private isFormField(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      element.hasAttribute('contenteditable')
    );
  }
  
  /**
   * Check if element is a search field
   * Uses type, name, and placeholder heuristics
   */
  private isSearchField(element: HTMLElement): boolean {
    if (element instanceof HTMLInputElement) {
      return (
        element.type === 'search' ||
        element.name.toLowerCase().includes('search') ||
        element.placeholder.toLowerCase().includes('search')
      );
    }
    return false;
  }
  
  /**
   * Check if element is a password field
   */
  private isPasswordField(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement &&
      element.type === 'password'
    );
  }
  
  /**
   * Check if element is a rich text editor
   * Common patterns: contenteditable + class/data attributes
   */
  private isTextEditor(element: HTMLElement): boolean {
    if (element.hasAttribute('contenteditable')) {
      const parent = element.parentElement;
      return (
        parent !== null &&
        (parent.classList.contains('editor') ||
         parent.hasAttribute('data-editor') ||
         parent.classList.contains('ql-editor') ||      // Quill
         parent.classList.contains('ProseMirror') ||    // ProseMirror
         parent.classList.contains('DraftEditor'))      // Draft.js
      );
    }
    return false;
  }
  
  /**
   * Monitor animation frame rate in background
   * Uses requestAnimationFrame() counting technique
   */
  private monitorAnimationFrameRate(): void {
    let frameCount = 0;
    
    const countFrame = () => {
      frameCount++;
      const now = Date.now();
      const elapsed = now - this.frameCountStartTime;
      
      // Calculate FPS every second
      if (elapsed >= 1000) {
        this.animationFrameRequestRate = frameCount;
        frameCount = 0;
        this.frameCountStartTime = now;
        
        // Log if unusually high (gaming indicator)
        if (this.animationFrameRequestRate > 50) {
          Logger.debug(`High frame rate detected: ${this.animationFrameRequestRate} FPS`);
        }
      }
      
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
  }
  
  /**
   * Get mouse movement context for adaptive obfuscation
   * 
   * @param event - Mouse event
   * @param lastPosition - Previous mouse position
   * @param lastTimestamp - Previous event timestamp
   * @returns Mouse context object
   */
  getMouseContext(
    event: MouseEvent,
    lastPosition: { x: number; y: number } | null,
    lastTimestamp: number
  ): MouseContext {
    const now = performance.now();
    const timeDelta = now - lastTimestamp;
    
    let velocity = 0;
    let acceleration = 0;
    let distance = 0;
    
    if (lastPosition && timeDelta > 0) {
      distance = Math.sqrt(
        Math.pow(event.clientX - lastPosition.x, 2) +
        Math.pow(event.clientY - lastPosition.y, 2)
      );
      velocity = distance / timeDelta; // pixels per millisecond
      
      // Calculate acceleration (simplified)
      // In real implementation, would track velocity history
      acceleration = velocity / timeDelta;
    }
    
    const context: MouseContext = {
      isGaming: this.isGamingContext(),
      isDragging: event.buttons > 0, // Mouse button pressed
      isHovering: this.isHoveringInteractiveElement(event.target as HTMLElement),
      velocity,
      acceleration,
      distance
    };
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Mouse context: ${JSON.stringify(context)}`);
    }
    
    return context;
  }
  
  /**
   * Check if mouse is hovering over interactive element
   */
  private isHoveringInteractiveElement(element: HTMLElement | null): boolean {
    if (!element) return false;
    
    const interactiveSelectors = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[tabindex]'
    ];
    
    return interactiveSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }
  
  /**
   * Get scroll context for adaptive obfuscation
   * 
   * @param scrollDelta - Scroll delta (x, y)
   * @param velocity - Current scroll velocity
   * @param isReadingMode - Whether reading mode is detected
   * @returns Scroll context object
   */
  getScrollContext(
    scrollDelta: { x: number; y: number },
    velocity: number,
    isReadingMode: boolean
  ): ScrollContext {
    const distance = Math.sqrt(scrollDelta.x * scrollDelta.x + scrollDelta.y * scrollDelta.y);
    
    // Determine scroll direction
    let direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'none';
    if (Math.abs(scrollDelta.y) > Math.abs(scrollDelta.x)) {
      direction = scrollDelta.y > 0 ? 'down' : 'up';
    } else if (Math.abs(scrollDelta.x) > 0) {
      direction = scrollDelta.x > 0 ? 'right' : 'left';
    }
    
    const context: ScrollContext = {
      isReading: isReadingMode,
      isFastScroll: velocity > 10, // pixels per millisecond
      isSmoothScroll: velocity > 0 && velocity < 5, // Smooth, controlled scrolling
      velocity,
      direction,
      distance
    };
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Scroll context: ${JSON.stringify(context)}`);
    }
    
    return context;
  }
}

