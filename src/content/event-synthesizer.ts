import { KeyboardEventData, MouseEventData } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';
import { markAsSynthetic } from './extension-hider';

/**
 * Creates synthetic keyboard events from stored data
 * Events must be indistinguishable from native events to avoid detection
 * 
 * CRITICAL: Synthetic events must have special marker to prevent re-interception
 */
export class EventSynthesizer {
  
  /**
   * Create and dispatch synthetic keyboard event
   * 
   * INPUT CONTRACT:
   * @param eventData - Cloned event properties
   * @param target - Original event target element
   * @param type - Event type ('keydown' or 'keyup')
   * 
   * OUTPUT CONTRACT:
   * - Synthetic event dispatched to target
   * - Event marked as synthetic (prevents re-interception)
   * - All original properties preserved
   * 
   * CHROME API:
   * new KeyboardEvent(type, init) - Create keyboard event
   * element.dispatchEvent(event) - Dispatch to element
   */
  synthesizeAndDispatch(
    eventData: KeyboardEventData,
    target: EventTarget | null,
    type: string = 'keydown'
  ): void {
    if (!target) {
      Logger.error('Cannot dispatch: no target element');
      return;
    }
    
    // EFFICIENCY: Lazy evaluation for debug logs
    if (CONSTANTS.DEBUG.ENABLED && CONSTANTS.DEBUG.LOG_KEYSTROKES) {
      Logger.debug(() => `Synthesizing ${type} event: ${eventData.key}`);
    } else if (CONSTANTS.DEBUG.ENABLED) {
      Logger.info(`Synthesizing ${type} event`);
    }
    
    // Create synthetic event with all original properties
    // CRITICAL: Synthetic events have isTrusted: false (read-only, cannot be changed)
    // Advanced trackers can detect this, but we mitigate with:
    // 1. Microsecond jitter in delays
    // 2. Gaussian distribution for realistic patterns
    // 3. Performance.now() coarsening
    const syntheticEvent = new KeyboardEvent(type, {
      key: eventData.key,
      code: eventData.code,
      keyCode: eventData.keyCode,
      which: eventData.which,
      charCode: eventData.charCode,
      location: eventData.location,
      repeat: eventData.repeat,
      ctrlKey: eventData.ctrlKey,
      shiftKey: eventData.shiftKey,
      altKey: eventData.altKey,
      metaKey: eventData.metaKey,
      bubbles: true,        // Allow normal event propagation
      cancelable: true,     // Allow preventDefault()
      composed: true        // Cross shadow DOM boundaries
      // Note: timeStamp, isTrusted, view are read-only and set by browser
      // We rely on timing obfuscation rather than perfect event cloning
    });
    
    // Mark as synthetic to prevent re-interception infinite loop
    // Use Symbol instead of string for better security
    markAsSynthetic(syntheticEvent);
    
    // Dispatch to original target element
    const dispatched = target.dispatchEvent(syntheticEvent);
    
    // For input elements, also update the value directly to ensure text appears
    // This handles cases where sites don't properly process keyboard events
    if (type === 'keydown' && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const key = eventData.key;
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const currentValue = element.value;
      let newValue = currentValue;
      let newPosition = start;
      
      // Handle special keys
      if (key === 'Backspace') {
        if (start === end && start > 0) {
          // Delete character before cursor
          newValue = currentValue.substring(0, start - 1) + currentValue.substring(start);
          newPosition = start - 1;
        } else if (start !== end) {
          // Delete selection
          newValue = currentValue.substring(0, start) + currentValue.substring(end);
          newPosition = start;
        }
      } else if (key === 'Delete') {
        if (start === end && start < currentValue.length) {
          // Delete character after cursor
          newValue = currentValue.substring(0, start) + currentValue.substring(start + 1);
          newPosition = start;
        } else if (start !== end) {
          // Delete selection
          newValue = currentValue.substring(0, start) + currentValue.substring(end);
          newPosition = start;
        }
      } else if (key === 'Enter' && element instanceof HTMLTextAreaElement) {
        // Insert newline in textarea
        newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
        newPosition = start + 1;
      } else if (key.length === 1 && !eventData.ctrlKey && !eventData.altKey && !eventData.metaKey) {
        // Printable character - insert at cursor
        newValue = currentValue.substring(0, start) + key + currentValue.substring(end);
        newPosition = start + 1;
      }
      
      // Update value if it changed
      if (newValue !== currentValue) {
        element.value = newValue;
        element.setSelectionRange(newPosition, newPosition);
        
        // Dispatch input event for frameworks (React, Vue, etc.)
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: key === 'Backspace' ? 'deleteContentBackward' : 
                     key === 'Delete' ? 'deleteContentForward' :
                     key === 'Enter' ? 'insertLineBreak' : 'insertText',
          data: key.length === 1 ? key : null
        });
        markAsSynthetic(inputEvent);
        element.dispatchEvent(inputEvent);
      }
    }
    
    Logger.debug(`Dispatched synthetic ${type} to`, (target as Element).tagName);
  }
  
  /**
   * Create and dispatch synthetic mouse event
   * 
   * @param eventData - Obfuscated mouse event data
   * @param target - Original event target element
   */
  synthesizeAndDispatchMouse(
    eventData: MouseEventData,
    target: EventTarget | null
  ): void {
    if (!target) {
      Logger.error('Cannot dispatch mouse event: no target element');
      return;
    }
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Synthesizing mousemove event:', {
        x: eventData.clientX,
        y: eventData.clientY,
        movementX: eventData.movementX,
        movementY: eventData.movementY
      });
    }
    
    // Create synthetic mouse event with obfuscated coordinates
    const syntheticEvent = new MouseEvent(eventData.type, {
      clientX: eventData.clientX,
      clientY: eventData.clientY,
      screenX: eventData.screenX,
      screenY: eventData.screenY,
      button: eventData.button,
      buttons: eventData.buttons,
      ctrlKey: eventData.ctrlKey,
      shiftKey: eventData.shiftKey,
      altKey: eventData.altKey,
      metaKey: eventData.metaKey,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    // Mark as synthetic to prevent re-interception
    markAsSynthetic(syntheticEvent);
    
    // Dispatch to original target
    target.dispatchEvent(syntheticEvent);
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Dispatched synthetic mousemove to', (target as Element).tagName);
    }
  }
  
}

