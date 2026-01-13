import { StorageManager } from './storage-manager';
import { StatisticsManager } from './statistics-manager';
import { SettingsExporter } from './settings-exporter';
import { Messaging, MessageType } from '../shared/messaging';
import { 
  DetectionResult, 
  Message, 
  MessageResponse,
  ExportSettingsPayload,
  ImportSettingsPayload,
  GetSettingsPayload,
  UpdateSiteSettingsPayload,
  UpdateSettingsPayload,
  DetectionFoundPayload,
  GetDetectionsPayload,
  TrackEventPayload
} from '../shared/types';
import { Logger } from '../shared/logger';
import { CONSTANTS } from '../shared/constants';
import { tabs, action, notifications, storage } from '../shared/browser-compat';

/**
 * Service Worker (Background Script)
 * 
 * RESPONSIBILITIES:
 * 1. Manage persistent storage
 * 2. Route messages between content scripts and popup
 * 3. Handle tracker detection notifications
 * 4. Update extension badge when protection active
 * 
 * MANIFEST V3 NOTES:
 * - Service worker can be terminated at any time
 * - Must handle intermittent shutdown/restart
 * - Use chrome.storage for state persistence (not variables)
 * - Keep-alive pattern: Send message every 20 seconds during critical operations
 */
class ServiceWorker {
  private storageManager: StorageManager;
  private statisticsManager: StatisticsManager;
  private settingsExporter: SettingsExporter;
  
  constructor() {
    this.storageManager = new StorageManager();
    this.statisticsManager = new StatisticsManager();
    this.settingsExporter = new SettingsExporter(this.storageManager);
  }
  
  /**
   * Initialize service worker
   * Called when service worker starts (first install or restart)
   */
  async initialize(): Promise<void> {
    Logger.info('Service worker starting...');
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug('Timestamp:', new Date().toISOString());
    }
    
    // Initialize storage
    await this.storageManager.initialize();
    
    // Initialize statistics
    await this.statisticsManager.initialize();
    
    // Set up message handlers
    this.setupMessageHandlers();
    
    // Set up browser action (extension icon click)
    this.setupBrowserAction();
    
    Logger.info('Service worker initialized successfully');
  }
  
  /**
   * Register message handlers
   * Uses Messaging wrapper for type safety
   */
  private setupMessageHandlers(): void {
    Logger.info('Setting up message handlers');
    
    Messaging.onMessage(async (message: Message, sender) => {
      Logger.debug('Received message:', message.type);
      
      switch (message.type) {
        case MessageType.GET_SETTINGS:
          return this.handleGetSettings(message.payload as GetSettingsPayload | undefined);
          
        case MessageType.UPDATE_SITE_SETTINGS:
          return this.handleUpdateSiteSettings(message.payload as UpdateSiteSettingsPayload);
          
        case MessageType.DETECTION_FOUND:
          return this.handleDetection(message.payload as DetectionFoundPayload, sender);
          
        case MessageType.GET_DETECTIONS:
          return this.handleGetDetections(message.payload as GetDetectionsPayload | undefined);
          
        case MessageType.GET_CURRENT_SITE_SETTINGS:
          return this.handleGetCurrentSiteSettings(sender);
          
        case MessageType.TRACK_EVENT:
          return this.handleTrackEvent(message.payload as TrackEventPayload);
          
        case MessageType.GET_STATISTICS:
          return this.handleGetStatistics();
          
        case MessageType.RESET_STATISTICS:
          return this.handleResetStatistics();
          
        case MessageType.EXPORT_SETTINGS:
          return this.handleExportSettings(message.payload as ExportSettingsPayload | undefined);
          
        case MessageType.IMPORT_SETTINGS:
          return this.handleImportSettings(message.payload as ImportSettingsPayload);
          
        case MessageType.UPDATE_SETTINGS:
          return this.handleUpdateSettings(message.payload as UpdateSettingsPayload);
          
        case MessageType.ONBOARDING_COMPLETE:
          return this.handleOnboardingComplete();
          
        case MessageType.GET_ONBOARDING_STATUS:
          return this.handleGetOnboardingStatus();
          
        default:
          Logger.error('Unknown message type:', message.type);
          return { success: false, error: 'Unknown message type' };
      }
    });
  }
  
  /**
   * Handle GET_SETTINGS request
   * Called by content script on page load
   */
  private async handleGetSettings(payload?: GetSettingsPayload): Promise<MessageResponse> {
    const { domain } = payload || {};
    Logger.debug(`Getting settings for domain: ${domain}`);
    
    const globalSettings = await this.storageManager.getSettings();
    const siteSettings = await this.storageManager.getSiteSettings(domain || '');
    
    return {
      settings: {
        ...globalSettings,
        ...siteSettings
      }
    };
  }
  
  /**
   * Handle UPDATE_SITE_SETTINGS request
   * Called by popup when user changes settings
   */
  private async handleUpdateSiteSettings(payload: UpdateSiteSettingsPayload): Promise<MessageResponse> {
    const { domain, settings } = payload;
    Logger.debug(`Updating settings for ${domain}:`, settings);
    
    // Save to storage
    await this.storageManager.saveSiteSettings(domain, settings);
    
    // Notify all tabs on this domain
    const allTabs = await tabs.query({ url: `*://${domain}/*` });
    Logger.debug(`Notifying ${allTabs.length} tabs of settings update`);
    
    for (const tab of allTabs) {
      if (tab.id) {
        try {
          await Messaging.sendToTab(tab.id, {
            type: MessageType.SETTINGS_UPDATED,
            payload: settings as any // SiteSettings payload for SETTINGS_UPDATED message
          });
        } catch (error) {
          Logger.error(`Failed to notify tab ${tab.id}:`, error);
        }
      }
    }
    
    return { success: true };
  }
  
  /**
   * Handle DETECTION_FOUND notification
   * Called by content script when tracker detected
   */
  private async handleDetection(
    payload: DetectionFoundPayload,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    const { domain, detection } = payload;
    Logger.info(`Tracker detected on ${domain}:`, detection.name);
    
    // Store detection with domain for filtering (v0.2.0 enhancement)
    const detectionWithDomain = { ...detection, domain };
    await this.storageManager.addDetection(detectionWithDomain);
    
    // Track in statistics
    await this.statisticsManager.trackDetection(detection, domain);
    
    // Show notification if enabled
    const settings = await this.storageManager.getSettings();
    if (settings.showNotifications) {
      Logger.debug('Showing notification');
      this.showNotification(detection);
    }
    
    // UX IMPROVEMENT: Update badge with enhanced visual indicator
    if (sender.tab?.id) {
      Logger.debug(`Updating badge for tab ${sender.tab.id}`);
      await this.updateBadge(sender.tab.id, domain);
    }
    
    return { success: true };
  }
  
  /**
   * Handle GET_DETECTIONS request
   * Called by popup to display tracker alerts
   */
  private async handleGetDetections(payload?: GetDetectionsPayload): Promise<MessageResponse> {
    const { domain } = payload || {};
    Logger.debug('Getting detections', domain ? `for ${domain}` : '');
    
    const detections = await this.storageManager.getDetections(domain);
    
    return { detections };
  }
  
  /**
   * Handle GET_CURRENT_SITE_SETTINGS request
   * Called by popup when opened to get current tab's settings
   * 
   * SYNC FIX: When popup is opened in a tab (pop-out), find the last active regular website tab
   * instead of using the extension page itself
   */
  private async handleGetCurrentSiteSettings(
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    // Get active tab
    let allTabs = await tabs.query({ active: true, currentWindow: true });
    let activeTab = allTabs[0];
    
    // SYNC FIX: If the active tab is an extension page (pop-out tab), find the last regular website tab
    if (activeTab?.url?.startsWith('chrome-extension://') || 
        activeTab?.url?.startsWith('chrome://') ||
        activeTab?.url?.startsWith('moz-extension://')) {
      Logger.debug('Active tab is extension page, finding last regular website tab...');
      
      // Get all tabs and find the last active regular website tab
      allTabs = await tabs.query({ currentWindow: true });
      const regularTabs = allTabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('moz-extension://') &&
        !tab.url.startsWith('about:')
      );
      
      // Sort by last accessed time (most recent first) and get the first one
      regularTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      activeTab = regularTabs[0];
      
      if (!activeTab) {
        Logger.warn('No regular website tab found, using default settings');
        // Return default settings if no regular tab found
        const globalSettings = await this.storageManager.getSettings();
        return {
          domain: '',
          settings: globalSettings,
          detections: []
        };
      }
    }
    
    if (!activeTab?.url) {
      Logger.error('No active tab found');
      return { error: 'No active tab' };
    }
    
    // SECURITY: Validate URL before processing
    let domain: string;
    try {
      const url = new URL(activeTab.url);
      domain = url.hostname;
      
      // SECURITY: Validate domain length
      if (domain.length > 253) {
        Logger.error('Invalid domain length');
        return { error: 'Invalid domain' };
      }
    } catch (error) {
      Logger.error('Invalid URL format:', error);
      return { error: 'Invalid URL' };
    }
    
    Logger.debug(`Getting current site settings for: ${domain}`);
    
    const globalSettings = await this.storageManager.getSettings();
    const siteSettings = await this.storageManager.getSiteSettings(domain);
    const detections = await this.storageManager.getDetections(domain);
    
    // UX IMPROVEMENT: Update badge when popup opens (only for regular tabs, not extension pages)
    if (sender.tab?.id && activeTab.id && !activeTab.url.startsWith('chrome-extension://')) {
      await this.updateBadge(activeTab.id, domain);
    }
    
    return {
      domain,
      settings: { ...globalSettings, ...siteSettings },
      detections
    };
  }
  
  /**
   * Show browser notification
   * Chrome API: chrome.notifications.create()
   */
  private showNotification(detection: DetectionResult): void {
    notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: 'Kala Alert',
      message: `Detected: ${detection.name}`,
      priority: detection.severity === 'high' ? 2 : 1
    });
  }
  
  /**
   * Handle TRACK_EVENT request
   * Called by content script to track obfuscated events
   */
  private async handleTrackEvent(payload: TrackEventPayload): Promise<MessageResponse> {
    const { eventType, processingTime } = payload;
    await this.statisticsManager.trackEvent(eventType, processingTime);
    return { success: true };
  }
  
  /**
   * Handle GET_STATISTICS request
   * Called by popup to display statistics
   */
  private async handleGetStatistics(): Promise<MessageResponse> {
    const statistics = this.statisticsManager.getStatistics();
    return { statistics };
  }
  
  /**
   * Handle RESET_STATISTICS request
   * Called by popup to reset statistics
   */
  private async handleResetStatistics(): Promise<MessageResponse> {
    await this.statisticsManager.reset();
    return { success: true };
  }
  
  /**
   * Handle EXPORT_SETTINGS request
   */
  private async handleExportSettings(payload?: ExportSettingsPayload): Promise<MessageResponse> {
    // Support both includeStats and includeStatistics for backward compatibility
    const includeStats = payload?.includeStats ?? payload?.includeStatistics ?? false;
    try {
      const jsonData = await this.settingsExporter.exportSettings(includeStats);
      return { success: true, data: jsonData };
    } catch (error) {
      Logger.error('Failed to export settings:', error);
      return { success: false, error: String(error) };
    }
  }
  
  /**
   * Handle IMPORT_SETTINGS request
   */
  private async handleImportSettings(payload: ImportSettingsPayload): Promise<MessageResponse> {
    const { data, mode = 'merge' } = payload;
    if (!data) {
      return { success: false, error: 'No data provided' };
    }
    
    try {
      const result = await this.settingsExporter.importSettings(data, mode === 'replace' ? false : true);
      return result;
    } catch (error) {
      Logger.error('Failed to import settings:', error);
      return { success: false, error: String(error) };
    }
  }
  
  /**
   * Handle UPDATE_SETTINGS request
   * Called by popup to update global settings including advanced protections
   * ENHANCEMENT: Supports advanced protection settings (v0.2.0)
   */
  private async handleUpdateSettings(payload: UpdateSettingsPayload): Promise<MessageResponse> {
    try {
      Logger.debug('Updating global settings:', payload);
      
      // Get current settings
      const currentSettings = await this.storageManager.getSettings();
      
      // Merge with new settings
      const updatedSettings = {
        ...currentSettings,
        ...(payload.stealthMode !== undefined && { stealthMode: payload.stealthMode }),
        ...(payload.defaultPrivacyLevel && { defaultPrivacyLevel: payload.defaultPrivacyLevel }),
        ...(payload.customDelayMin !== undefined && { customDelayMin: payload.customDelayMin }),
        ...(payload.customDelayMax !== undefined && { customDelayMax: payload.customDelayMax }),
        ...(payload.advancedProtections && {
          advancedProtections: {
            ...currentSettings.advancedProtections,
            ...payload.advancedProtections
          }
        })
      };
      
      // Save updated settings
      await this.storageManager.saveSettings(updatedSettings);
      
      Logger.info('Global settings updated successfully');
      return { success: true };
    } catch (error) {
      Logger.error('Failed to update settings:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  /**
   * Handle ONBOARDING_COMPLETE request
   */
  private async handleOnboardingComplete(): Promise<MessageResponse> {
    try {
      await storage.local.set({ kala_onboarding_completed: true });
      return { success: true };
    } catch (error) {
      Logger.error('Failed to mark onboarding as complete:', error);
      return { success: false, error: String(error) };
    }
  }
  
  /**
   * Handle GET_ONBOARDING_STATUS request
   */
  private async handleGetOnboardingStatus(): Promise<MessageResponse> {
    try {
      const result = await storage.local.get('kala_onboarding_completed');
      return { completed: !!result.kala_onboarding_completed };
    } catch (error) {
      Logger.error('Failed to get onboarding status:', error);
      return { success: false, error: String(error) };
    }
  }
  
  /**
   * Set up browser action handler
   * Called when user clicks extension icon
   * 
   * NOTE: In Manifest V3, if default_popup is set in manifest.json,
   * the onClicked listener won't fire - the popup opens instead.
   * To enable badge click toggle, remove default_popup from manifest.
   * For now, we keep the popup and use keyboard shortcut for quick toggle.
   */
  private setupBrowserAction(): void {
    // Only set up listener if no default_popup (would need manifest change)
    // For now, badge click opens popup (handled by manifest)
    // Keyboard shortcut (Ctrl+Shift+K) provides quick toggle
    Logger.debug('Browser action setup: Popup opens on click (use Ctrl+Shift+K for quick toggle)');
  }
  
  /**
   * Set up keyboard shortcuts
   * UX IMPROVEMENT: Allow quick toggle via keyboard
   */
  private setupKeyboardShortcuts(): void {
    // Use browser-compat for cross-browser support
    if (typeof chrome !== 'undefined' && chrome.commands) {
      chrome.commands.onCommand.addListener((command) => {
        if (command === 'toggle-protection') {
          this.toggleProtectionForActiveTab();
        }
      });
    }
  }
  
  /**
   * Toggle protection for active tab
   * Called by keyboard shortcut
   */
  private async toggleProtectionForActiveTab(): Promise<void> {
    try {
      const allTabs = await tabs.query({ active: true, currentWindow: true });
      const activeTab = allTabs[0];
      
      if (!activeTab?.url || !activeTab.id) {
        Logger.warn('No active tab found for keyboard shortcut');
        return;
      }
      
      const url = new URL(activeTab.url);
      const domain = url.hostname;
      
      // Get current settings
      const siteSettings = await this.storageManager.getSiteSettings(domain);
      const newEnabled = !siteSettings.enabled;
      
      // Update settings
      await this.storageManager.saveSiteSettings(domain, {
        ...siteSettings,
        enabled: newEnabled
      });
      
      // Notify content script
      await Messaging.sendToTab(activeTab.id, {
        type: MessageType.SETTINGS_UPDATED,
        payload: {
          enabled: newEnabled,
          privacyLevel: siteSettings.privacyLevel,
          whitelisted: siteSettings.whitelisted
        } as any // SiteSettings payload for SETTINGS_UPDATED message
      });
      
      // Update badge
      await this.updateBadge(activeTab.id, domain);
      
      Logger.info(`Protection ${newEnabled ? 'enabled' : 'disabled'} via keyboard shortcut`);
    } catch (error) {
      Logger.error('Failed to toggle protection via keyboard shortcut:', error);
    }
  }
  
  /**
   * Set up tab listeners for badge updates
   * UX IMPROVEMENT: Update badge when switching tabs
   */
  private setupTabListeners(): void {
    tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await tabs.get(activeInfo.tabId);
        if (tab?.url) {
          const url = new URL(tab.url);
          await this.updateBadge(activeInfo.tabId, url.hostname);
        }
      } catch (error) {
        Logger.error('Failed to update badge on tab activation:', error);
      }
    });
    
    tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab?.url) {
        try {
          const url = new URL(tab.url);
          await this.updateBadge(tabId, url.hostname);
        } catch (error) {
          Logger.error('Failed to update badge on tab update:', error);
        }
      }
    });
  }
  
  /**
   * Update badge based on protection status
   * UX IMPROVEMENT: Color-coded badge with visual indicators
   * 
   * @param tabId - Tab ID to update badge for
   * @param domain - Domain to check protection status for
   */
  private async updateBadge(tabId: number, domain: string): Promise<void> {
    try {
      const siteSettings = await this.storageManager.getSiteSettings(domain);
      const detections = await this.storageManager.getDetections(domain);
      
      if (!siteSettings.enabled) {
        // Disabled - Red badge
        await action.setBadgeText({
          text: '❌',
          tabId
        });
        await action.setBadgeBackgroundColor({
          color: '#f44336', // Red
          tabId
        });
        return;
      }
      
      if (detections.length > 0) {
        // Trackers detected - Show count, no warning icon (clean design)
        await action.setBadgeText({
          text: String(detections.length),
          tabId
        });
        await action.setBadgeBackgroundColor({
          color: '#333333', // Dark gray - subtle, matches Dieter Rams aesthetic
          tabId
        });
        return;
      }
      
      // Protected - Color based on privacy level
      const badgeText = '🛡️';
      
      const badgeColor = siteSettings.privacyLevel === 'high' ? '#4caf50' : // Green
                         siteSettings.privacyLevel === 'medium' ? '#2196f3' : // Blue
                         '#9e9e9e'; // Gray
      
      await action.setBadgeText({
        text: badgeText,
        tabId
      });
      
      await action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId
      });
    } catch (error) {
      Logger.error('Failed to update badge:', error);
    }
  }
}

// Initialize service worker
Logger.info('Service worker script loaded');
const serviceWorker = new ServiceWorker();
serviceWorker.initialize().catch(error => {
  Logger.error('Service worker initialization failed:', error);
});

