import { KeyboardEventData, QueuedEvent } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Priority queue for delayed event dispatch
 * Maintains original event ordering despite variable delays
 * 
 * EXAMPLE SCENARIO:
 * Event A arrives at t=0, delay=100ms → scheduled for t=100
 * Event B arrives at t=20, delay=50ms → scheduled for t=70
 * 
 * Without ordering: B dispatches first (wrong order)
 * With ordering: A dispatches first because originalIndex=0 < originalIndex=1
 */
export class EventQueue {
  private queue: QueuedEvent[] = [];
  private processingTimer: number | null = null;
  private eventIndex: number = 0;  // Monotonic counter for ordering
  
  /**
   * Add event to queue with delay
   * 
   * INPUT CONTRACT:
   * @param event - Keyboard event data to dispatch later
   * @param delay - Milliseconds to wait before dispatch
   * @param callback - Function to call when ready to dispatch
   * 
   * OUTPUT CONTRACT:
   * - Event scheduled for future dispatch
   * - Queue automatically sorted by time then index
   * - Processing timer scheduled if not already running
   */
  enqueue(
    event: KeyboardEventData,
    delay: number,
    callback: (event: KeyboardEventData) => void
  ): void {
    const now = performance.now(); // Use performance.now() for better precision
    const scheduledTime = now + delay;
    
    const queuedEvent: QueuedEvent = {
      event,
      originalTimestamp: now,
      scheduledTimestamp: scheduledTime,
      originalIndex: this.eventIndex++
    };
    
    // EFFICIENCY: Lazy evaluation for debug logs (only evaluated if DEBUG enabled)
    if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
      Logger.debug(
        () => {
          const eventKey = 'key' in event ? event.key : 'mouse/scroll';
          return `Enqueued event ${queuedEvent.originalIndex}: ${eventKey} scheduled for +${delay}ms`;
        }
      );
    } else if (CONSTANTS.DEBUG.ENABLED) {
      Logger.info(
        () => `Enqueued event ${queuedEvent.originalIndex} scheduled for +${delay}ms`
      );
    }
    
    // Store callback with event (TypeScript hack)
    (queuedEvent as any).callback = callback;
    
    // OPTIMIZATION: Insert in sorted position instead of sorting entire queue
    // This reduces complexity from O(n log n) to O(n) for typical queue sizes
    this.insertInOrder(queuedEvent);
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => `Queue size: ${this.queue.length}`);
    }
    
    // Check queue size limit
    if (this.queue.length > CONSTANTS.PERFORMANCE.MAX_QUEUE_SIZE) {
      Logger.warn('Queue size exceeded limit!');
      // Remove oldest events if limit exceeded
      const excess = this.queue.length - CONSTANTS.PERFORMANCE.MAX_QUEUE_SIZE;
      this.queue.splice(0, excess);
    }
    
    // Schedule processing if not already scheduled
    this.scheduleProcessing();
  }
  
  /**
   * Insert event in sorted position (optimized insertion)
   * Uses binary search for O(log n) insertion instead of O(n log n) sort
   */
  private insertInOrder(queuedEvent: QueuedEvent): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.queue.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const compare = this.compareEvents(queuedEvent, this.queue[mid]);
      if (compare < 0) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    
    this.queue.splice(left, 0, queuedEvent);
  }
  
  /**
   * Compare two events for sorting
   * Returns: negative if a < b, positive if a > b, 0 if equal
   */
  private compareEvents(a: QueuedEvent, b: QueuedEvent): number {
    // Primary: scheduled timestamp
    if (a.scheduledTimestamp !== b.scheduledTimestamp) {
      return a.scheduledTimestamp - b.scheduledTimestamp;
    }
    // Secondary: original index (preserve order for same timestamp)
    return a.originalIndex - b.originalIndex;
  }
  
  /**
   * Schedule timer to process next event in queue
   * Only one timer active at a time
   */
  private scheduleProcessing(): void {
    // Already have timer scheduled
    if (this.processingTimer !== null) {
      return;
    }
    
    // Queue is empty
    if (this.queue.length === 0) {
      return;
    }
    
    // Get next event (queue is sorted, so first element is next)
    const nextEvent = this.queue[0];
    const delay = Math.max(0, nextEvent.scheduledTimestamp - performance.now());
    
    Logger.debug(
      `Scheduling next event in ${delay}ms`,
      `(index: ${nextEvent.originalIndex})`
    );
    
    // Schedule timer
    this.processingTimer = window.setTimeout(() => {
      this.processNext();
    }, delay);
  }
  
  /**
   * Process next event in queue
   * EFFICIENCY: Processes batches of events ready at the same time
   * Called by setTimeout when scheduled time arrives
   */
  private processNext(): void {
    this.processingTimer = null;
    
    if (this.queue.length === 0) {
      return;
    }
    
    // EFFICIENCY: Process batch of events ready at the same time (within 1ms window)
    const now = performance.now();
    const readyEvents: QueuedEvent[] = [];
    
    // Collect all events ready to process (within 1ms window)
    while (this.queue.length > 0) {
      const nextEvent = this.queue[0];
      const delay = nextEvent.scheduledTimestamp - now;
      
      if (delay <= 1) { // Process events within 1ms window together
        readyEvents.push(this.queue.shift()!);
      } else {
        break;
      }
    }
    
    // Process all ready events
    for (const queuedEvent of readyEvents) {
      const callback = (queuedEvent as any).callback;
      
      // EFFICIENCY: Lazy evaluation for debug logs
      if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
        const eventKey = 'key' in queuedEvent.event ? queuedEvent.event.key : 'mouse/scroll';
        Logger.debug(() => `Processing event ${queuedEvent.originalIndex}: ${eventKey}`);
      } else if (CONSTANTS.DEBUG.ENABLED) {
        Logger.debug(() => `Processing event ${queuedEvent.originalIndex}`);
      }
      
      // Execute callback to dispatch event
      if (callback) {
        callback(queuedEvent.event);
      }
    }
    
    // Schedule next batch if queue not empty
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }
  
  /**
   * Clear all pending events
   * Called when protection disabled or content script unloads
   */
  clear(): void {
    Logger.debug(`Clearing queue (${this.queue.length} events)`);
    
    this.queue = [];
    
    if (this.processingTimer !== null) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    
    this.eventIndex = 0;
  }
  
  /**
   * Get current queue size for monitoring
   */
  getSize(): number {
    return this.queue.length;
  }
}

