import { Message, MessageType, MessageResponse } from './types';
import { Logger } from './logger';
import { runtime, tabs } from './browser-compat';

// Re-export MessageType for convenience
export { MessageType };

/**
 * Chrome Extension Messaging API wrapper
 * Provides type-safe communication between extension components
 * 
 * Chrome API Reference:
 * - chrome.runtime.sendMessage: Send to service worker
 * - chrome.tabs.sendMessage: Send to specific tab's content script
 * - chrome.runtime.onMessage: Listen for messages
 */
export class Messaging {
  /**
   * Send message from content script/popup to service worker
   * SECURITY: Validates message before sending
   * 
   * @param message - Typed message object
   * @returns Promise resolving to response from service worker
   * 
   * Example:
   *   const response = await Messaging.sendToBackground({
   *     type: MessageType.GET_SETTINGS,
   *     payload: { domain: 'example.com' }
   *   });
   */
  static async sendToBackground(message: Message): Promise<MessageResponse> {
    // SECURITY: Validate message before sending
    if (!validateMessage(message)) {
      Logger.error('Invalid message format:', message);
      return { success: false, error: 'Invalid message format' };
    }
    
    Logger.debug('Sending to background:', message.type);
    
    try {
      const response = await runtime.sendMessage(message);
      Logger.debug('Background response:', response);
      return response as MessageResponse;
    } catch (error) {
      Logger.error('Message send failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  /**
   * Send message from service worker to content script in specific tab
   * SECURITY: Validates message before sending
   * 
   * @param tabId - Chrome tab ID
   * @param message - Typed message object
   * @returns Promise resolving to response from content script
   */
  static async sendToTab(tabId: number, message: Message): Promise<MessageResponse> {
    // SECURITY: Validate message before sending
    if (!validateMessage(message)) {
      Logger.error('Invalid message format:', message);
      return { success: false, error: 'Invalid message format' };
    }
    
    Logger.debug(`Sending to tab ${tabId}:`, message.type);
    
    try {
      const response = await tabs.sendMessage(tabId, message);
      return response as MessageResponse;
    } catch (error) {
      // EXPECTED: Some tabs may not have content scripts loaded yet
      // This is normal when tabs are loading or don't match our content script pattern
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError = errorMessage.includes('Could not establish connection') ||
                                 errorMessage.includes('Receiving end does not exist');
      
      if (isConnectionError) {
        // Silently handle expected connection errors (tab doesn't have content script)
        // Don't log these - they're normal for chrome:// pages, extension pages, etc.
        return { success: false, error: 'Tab has no content script' };
      } else {
        // Only log unexpected errors (these are actual problems)
        Logger.error(`Tab ${tabId} message failed:`, error);
        return { success: false, error: errorMessage };
      }
    }
  }
  
  /**
   * Register listener for incoming messages
   * SECURITY: Validates messages before processing
   * Automatically handles async responses
   * 
   * @param callback - Async function handling message
   * 
   * Usage in service worker:
   *   Messaging.onMessage(async (message, sender) => {
   *     if (message.type === MessageType.GET_SETTINGS) {
   *       const settings = await loadSettings();
   *       return { settings };
   *     }
   *   });
   */
  static onMessage(
    callback: (
      message: Message,
      sender: chrome.runtime.MessageSender
    ) => Promise<MessageResponse>
  ): void {
    runtime.onMessage.addListener((message, sender, sendResponse) => {
      // SECURITY: Validate message before processing
      if (!validateMessage(message)) {
        Logger.error('Invalid message received:', message);
        sendResponse({ success: false, error: 'Invalid message format' });
        return true;
      }
      
      Logger.debug('Message received:', message.type, 'from', sender.tab?.id || 'popup');
      
      // Execute async callback and send response
      callback(message as Message, sender)
        .then(response => {
          Logger.debug('Sending response:', response);
          sendResponse(response);
        })
        .catch(error => {
          Logger.error('Message handler error:', error);
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        });
      
      // Return true to indicate async response
      return true;
    });
  }
}

/**
 * Validate message structure
 * SECURITY: Prevents processing of malicious or malformed messages
 * 
 * @param message - Message object to validate
 * @returns True if message is valid, false otherwise
 */
function validateMessage(message: unknown): message is Message {
  // Basic structure validation
  if (!message || typeof message !== 'object' || message === null) {
    return false;
  }
  
  const m = message as { type?: unknown; payload?: unknown; tabId?: unknown };
  
  // Validate message type
  if (typeof m.type !== 'string') {
    return false;
  }
  
  // Check if type is valid MessageType
  if (!Object.values(MessageType).includes(m.type as MessageType)) {
    return false;
  }
  
  // Type-specific payload validation
  return validateMessagePayload(m.type as MessageType, m.payload);
}

/**
 * Validate message payload based on message type
 * SECURITY: Type-specific validation prevents injection attacks
 * 
 * @param type - Message type
 * @param payload - Message payload to validate
 * @returns True if payload is valid for message type
 */
function validateMessagePayload(type: MessageType, payload: unknown): boolean {
  // Messages without payload are valid
  if (payload === undefined || payload === null) {
    return true;
  }
  
  // Payload must be an object
  if (typeof payload !== 'object') {
    return false;
  }
  
  // Type-specific validation
  switch (type) {
    case MessageType.GET_SETTINGS:
      return validateGetSettingsPayload(payload);
    
    case MessageType.UPDATE_SITE_SETTINGS:
      return validateUpdateSiteSettingsPayload(payload);
    
    case MessageType.DETECTION_FOUND:
      return validateDetectionFoundPayload(payload);
    
    case MessageType.GET_DETECTIONS:
      return validateGetDetectionsPayload(payload);
    
    case MessageType.TRACK_EVENT:
      return validateTrackEventPayload(payload);
    
    case MessageType.EXPORT_SETTINGS:
      return validateExportSettingsPayload(payload);
    
    case MessageType.IMPORT_SETTINGS:
      return validateImportSettingsPayload(payload);
    
    case MessageType.GET_CURRENT_SITE_SETTINGS:
      // No payload required
      return true;
    
    case MessageType.GET_STATISTICS:
    case MessageType.RESET_STATISTICS:
    case MessageType.SETTINGS_UPDATED:
    case MessageType.ENABLE_PROTECTION:
    case MessageType.DISABLE_PROTECTION:
      // These may have optional payloads
      return true;
    
    default:
      // Unknown message type - reject for security
      return false;
  }
}

/**
 * Validate GET_SETTINGS payload
 */
function validateGetSettingsPayload(payload: unknown): boolean {
  if (payload === undefined || payload === null) {
    return true; // Optional payload
  }
  
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { domain?: unknown };
  if (p.domain !== undefined) {
    return typeof p.domain === 'string' && 
           p.domain.length > 0 && 
           p.domain.length <= 253; // Max domain length
  }
  
  return true;
}

/**
 * Validate UPDATE_SITE_SETTINGS payload
 */
function validateUpdateSiteSettingsPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { domain?: unknown; settings?: unknown };
  
  // Domain must be valid string
  if (typeof p.domain !== 'string' || 
      p.domain.length === 0 || 
      p.domain.length > 253) {
    return false;
  }
  
  // Settings must be object
  if (!p.settings || typeof p.settings !== 'object' || p.settings === null) {
    return false;
  }
  
  return true;
}

/**
 * Validate DETECTION_FOUND payload
 */
function validateDetectionFoundPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { domain?: unknown; detection?: { name?: unknown } };
  
  // Domain must be valid string
  if (typeof p.domain !== 'string' || 
      p.domain.length === 0 || 
      p.domain.length > 253) {
    return false;
  }
  
  // Detection must be object with required fields
  if (!p.detection || typeof p.detection !== 'object' || p.detection === null) {
    return false;
  }
  
  if (typeof p.detection.name !== 'string' || 
      p.detection.name.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Validate GET_DETECTIONS payload
 */
function validateGetDetectionsPayload(payload: unknown): boolean {
  if (payload === undefined || payload === null) {
    return true; // Optional payload
  }
  
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { domain?: unknown };
  if (p.domain !== undefined) {
    return typeof p.domain === 'string' && 
           p.domain.length > 0 && 
           p.domain.length <= 253;
  }
  
  return true;
}

/**
 * Validate TRACK_EVENT payload
 */
function validateTrackEventPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { eventType?: unknown; processingTime?: unknown };
  
  // Event type must be valid
  const validEventTypes = ['keystroke', 'mouse', 'scroll'];
  if (typeof p.eventType !== 'string' || !validEventTypes.includes(p.eventType)) {
    return false;
  }
  
  // Processing time must be number
  if (typeof p.processingTime !== 'number' || 
      p.processingTime < 0 || 
      p.processingTime > 10000) { // Sanity check: max 10 seconds
    return false;
  }
  
  return true;
}

/**
 * Validate EXPORT_SETTINGS payload
 */
function validateExportSettingsPayload(payload: unknown): boolean {
  if (payload === undefined || payload === null) {
    return true; // Optional payload
  }
  
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { includeStats?: unknown };
  if (p.includeStats !== undefined) {
    return typeof p.includeStats === 'boolean';
  }
  
  return true;
}

/**
 * Validate IMPORT_SETTINGS payload
 */
function validateImportSettingsPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as { data?: unknown; mode?: unknown };
  
  // Data must be string (JSON)
  if (typeof p.data !== 'string' || p.data.length === 0) {
    return false;
  }
  
  // Size limit: 10MB
  if (p.data.length > 10 * 1024 * 1024) {
    return false;
  }
  
  // Mode must be valid
  if (p.mode !== undefined && 
      p.mode !== 'merge' && 
      p.mode !== 'replace') {
    return false;
  }
  
  return true;
}

