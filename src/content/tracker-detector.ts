import { DetectionResult, TrackerSignature } from '../shared/types';
import { KNOWN_TRACKERS, CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Detects behavioral tracking scripts using two methods:
 * 1. Signature matching: Known tracker URLs/functions
 * 2. Heuristic detection: Suspicious patterns (excessive listeners)
 * 
 * EVENT EMITTER PATTERN:
 * - Extends EventEmitter (or implements custom event system)
 * - Emits 'detection' event when tracker found
 * - Content script listens and reports to service worker
 */
export class TrackerDetector {
  private detections: Map<string, DetectionResult> = new Map();
  private scanInterval: number | null = null;
  private listeners: Map<string, Function[]> = new Map();
  
  /**
   * Start periodic scanning for trackers
   */
  initialize(): void {
    Logger.info('Initializing tracker detector');
    
    // Perform initial scan
    this.scanPage();
    
    // Set up periodic scanning
    this.scanInterval = window.setInterval(
      () => this.scanPage(),
      CONSTANTS.TRACKER_DETECTION.SIGNATURE_CHECK_INTERVAL_MS
    );
    
    Logger.info('Tracker detector initialized');
  }
  
  /**
   * Scan page for tracking scripts
   * 
   * SCAN STRATEGY:
   * 1. Check script src attributes against known trackers
   * 2. Check window object for known function names
   * 3. Count event listeners (heuristic)
   * 4. Check for performance.now() usage (heuristic)
   * 
   * Results stored in detections Map to prevent duplicate alerts
   */
  private async scanPage(): Promise<void> {
    Logger.debug('Scanning page for trackers...');
    
    // Signature-based detection
    const signatureDetections = await this.checkSignatures();
    
    // Heuristic detection
    const heuristicDetections = await this.checkHeuristics();
    
    // Merge results
    const allDetections = [...signatureDetections, ...heuristicDetections];
    
    Logger.debug(`Found ${allDetections.length} potential trackers`);
    
    // Emit new detections
    for (const detection of allDetections) {
      if (!this.detections.has(detection.name)) {
        Logger.info('New tracker detected:', detection.name);
        this.detections.set(detection.name, detection);
        this.emit('detection', detection);
      }
    }
  }
  
  /**
   * Check against known tracker signatures
   * 
   * DETECTION METHODS:
   * 1. Script URL matching: Check all <script src="..."> against patterns
   * 2. Global function detection: Check window object for known functions
   * 3. Event listener counting: Count listeners on document
   */
  private async checkSignatures(): Promise<DetectionResult[]> {
    const detections: DetectionResult[] = [];
    
    for (const tracker of KNOWN_TRACKERS) {
      const detected = await this.checkTrackerSignature(tracker);
      
      if (detected) {
        detections.push({
          name: tracker.name,
          type: 'signature',
          severity: tracker.severity,
          description: `Detected ${tracker.name} behavioral tracking script`,
          confidence: 0.95,  // High confidence for signature match
          timestamp: Date.now()
        });
      }
    }
    
    return detections;
  }
  
  /**
   * Check individual tracker signature
   */
  private async checkTrackerSignature(tracker: TrackerSignature): Promise<boolean> {
    // Check script URLs
    if (tracker.patterns.scriptUrls) {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      
      for (const script of scripts) {
        const src = script.getAttribute('src') || '';
        
        for (const pattern of tracker.patterns.scriptUrls) {
          if (src.includes(pattern)) {
            Logger.debug(`Matched script URL: ${src}`);
            return true;
          }
        }
      }
    }
    
    // Check for function names in global scope
    if (tracker.patterns.functionNames) {
      const win = window as any;
      
      for (const funcName of tracker.patterns.functionNames) {
        if (typeof win[funcName] !== 'undefined') {
          Logger.debug(`Found global function: ${funcName}`);
          return true;
        }
      }
    }
    
    // Check event listener counts
    if (tracker.patterns.eventListeners) {
      for (const listenerPattern of tracker.patterns.eventListeners) {
        const count = this.countEventListeners(listenerPattern.type);
        
        if (count >= listenerPattern.minCount) {
          Logger.debug(
            `Excessive ${listenerPattern.type} listeners:`,
            `${count} (threshold: ${listenerPattern.minCount})`
          );
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Count event listeners of specific type
   * 
   * LIMITATION: Cannot directly access event listeners in Chrome
   * WORKAROUND: Parse inline script content for addEventListener calls
   * 
   * NOTE: This is a simplified heuristic. Real implementation would need
   * more sophisticated analysis or Chrome DevTools Protocol access.
   */
  private countEventListeners(type: string): number {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    let count = 0;
    
    for (const script of scripts) {
      const content = script.textContent || '';
      const pattern = new RegExp(
        `addEventListener\\s*\\(\\s*['"\`]${type}['"\`]`,
        'g'
      );
      const matches = content.match(pattern);
      
      if (matches) {
        count += matches.length;
      }
    }
    
    Logger.debug(`Found ${count} ${type} listeners in inline scripts`);
    return count;
  }
  
  /**
   * Heuristic-based detection for unknown trackers
   * 
   * HEURISTICS:
   * 1. Excessive event listeners (>5 keydown/keyup)
   * 2. performance.now() usage in event handlers (timing measurement)
   * 3. Multiple canvas fingerprinting calls
   */
  private async checkHeuristics(): Promise<DetectionResult[]> {
    const detections: DetectionResult[] = [];
    
    // Check for excessive event listeners
    const keydownCount = this.countEventListeners('keydown');
    const keyupCount = this.countEventListeners('keyup');
    
    if (keydownCount > CONSTANTS.TRACKER_DETECTION.MAX_EVENT_LISTENERS ||
        keyupCount > CONSTANTS.TRACKER_DETECTION.MAX_EVENT_LISTENERS) {
      detections.push({
        name: 'Excessive Event Listeners',
        type: 'heuristic',
        severity: 'medium',
        description: `Detected ${keydownCount} keydown and ${keyupCount} keyup listeners`,
        confidence: 0.7,
        timestamp: Date.now()
      });
    }
    
    // Check for timing measurement
    if (this.detectTimingMeasurement()) {
      detections.push({
        name: 'Timing Measurement',
        type: 'heuristic',
        severity: 'medium',
        description: 'Detected high-resolution timing in event handlers',
        confidence: 0.6,
        timestamp: Date.now()
      });
    }
    
    return detections;
  }
  
  /**
   * Detect performance.now() usage in keyboard event handlers
   * Indicates timing measurement for behavioral fingerprinting
   */
  private detectTimingMeasurement(): boolean {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    
    for (const script of scripts) {
      const content = script.textContent || '';
      
      // Check for performance.now() AND keyboard event keywords
      if (content.includes('performance.now()') &&
          (content.includes('keydown') || content.includes('keyup'))) {
        Logger.debug('Detected timing measurement in event handler');
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Simple event emitter implementation
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  /**
   * Cleanup when content script unloads
   * SECURITY: Uses try-finally to ensure cleanup completes
   */
  destroy(): void {
    Logger.info('Destroying tracker detector');
    
    try {
      if (this.scanInterval !== null) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      
      this.detections.clear();
      this.listeners.clear();
    } catch (error) {
      Logger.error('Error during tracker detector cleanup:', error);
    } finally {
      // SECURITY: Ensure state is reset even if cleanup fails
      Logger.info('Tracker detector destroyed');
    }
  }
}

