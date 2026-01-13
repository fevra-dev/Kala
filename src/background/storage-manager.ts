import { GlobalSettings, SiteSettings, DetectionResult, StorageQuotaInfo } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';
import { ErrorHandler } from '../shared/error-handler';
import { storage } from '../shared/browser-compat';

/**
 * Manages persistent storage using Chrome Storage API
 * 
 * STORAGE STRUCTURE:
 * {
 *   "bg_settings": { defaultEnabled: true, ... },
 *   "bg_site_settings": {
 *     "example.com": { enabled: true, privacyLevel: "medium" },
 *     "game-site.com": { enabled: true, privacyLevel: "low" }
 *   },
 *   "bg_detections": [ {...}, {...} ],
 *   "bg_stats": { totalEventsObfuscated: 1234, ... }
 * }
 */
export class StorageManager {
  /**
   * Initialize storage with default settings
   * Called once when service worker starts
   */
  async initialize(): Promise<void> {
    Logger.info('Initializing storage manager');
    
    const settings = await this.getSettings();
    
    if (!settings || Object.keys(settings).length === 0) {
      Logger.info('No settings found, creating defaults');
      await this.saveSettings(this.getDefaultSettings());
    }
    
    Logger.info('Storage manager initialized');
  }
  
  /**
   * Get default global settings
   * ENHANCEMENT: Includes advanced protection defaults (v0.2.0)
   */
  private getDefaultSettings(): GlobalSettings {
    return {
      defaultEnabled: true,
      defaultPrivacyLevel: 'medium',
      showNotifications: true,
      enableContextDetection: true,
      customDelayMin: CONSTANTS.DELAY.MIN,
      customDelayMax: CONSTANTS.DELAY.MAX,
      advancedProtections: {
        digraphNoise: CONSTANTS.ADVANCED_PROTECTIONS.DIGRAPH_NOISE,
        sessionRandomization: CONSTANTS.ADVANCED_PROTECTIONS.SESSION_RANDOMIZATION,
        webworkerProtection: CONSTANTS.ADVANCED_PROTECTIONS.WEBWORKER_PROTECTION,
        mlEvasion: CONSTANTS.ADVANCED_PROTECTIONS.ML_EVASION,
        gaussianDistribution: CONSTANTS.EVASION.USE_GAUSSIAN_DISTRIBUTION,
        microJitter: CONSTANTS.EVASION.ADD_MICRO_JITTER,
        performanceCoarsening: CONSTANTS.EVASION.COARSEN_PERFORMANCE_NOW
      }
    };
  }
  
  /**
   * Load global settings
   * 
   * Chrome API: chrome.storage.local.get()
   * Returns Promise<{key: value}>
   */
  async getSettings(): Promise<GlobalSettings> {
    try {
      Logger.debug('Loading global settings');
      
      const result = await storage.local.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
      const settings = result[CONSTANTS.STORAGE_KEYS.SETTINGS];
      
      if (CONSTANTS.DEBUG.ENABLED) {
        Logger.debug('Loaded settings:', settings);
      }
      
      return settings || this.getDefaultSettings();
    } catch (error) {
      ErrorHandler.handleError(error, 'storage-manager:getSettings', true);
      return this.getDefaultSettings();
    }
  }
  
  /**
   * Save global settings
   * SECURITY: Checks quota before saving
   */
  async saveSettings(settings: GlobalSettings): Promise<void> {
    try {
      Logger.debug('Saving global settings:', settings);
      
      // Estimate size (rough approximation: JSON string length)
      const estimatedSize = JSON.stringify(settings).length;
      await this.ensureQuota(estimatedSize);
      
      await storage.local.set({
        [CONSTANTS.STORAGE_KEYS.SETTINGS]: settings
      });
    } catch (error) {
      ErrorHandler.handleError(error, 'storage-manager:saveSettings', true);
      throw error;
    }
  }
  
  /**
   * Get settings for specific domain
   * Falls back to defaults if no per-site settings exist
   */
  async getSiteSettings(domain: string): Promise<SiteSettings> {
    Logger.debug(`Loading settings for domain: ${domain}`);
    
    const result = await storage.local.get(CONSTANTS.STORAGE_KEYS.SITE_SETTINGS);
    const allSiteSettings = result[CONSTANTS.STORAGE_KEYS.SITE_SETTINGS] || {};
    
    const siteSettings = allSiteSettings[domain] || {
      enabled: true,
      privacyLevel: 'medium',
      whitelisted: false
    };
    
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(`Site settings for ${domain}:`, siteSettings);
    }
    
    return siteSettings;
  }
  
  /**
   * Save settings for specific domain
   * SECURITY: Checks quota before saving
   */
  async saveSiteSettings(domain: string, settings: SiteSettings): Promise<void> {
    Logger.debug(`Saving settings for ${domain}:`, settings);
    
    // Load all site settings
    const result = await storage.local.get(CONSTANTS.STORAGE_KEYS.SITE_SETTINGS);
    const allSiteSettings = result[CONSTANTS.STORAGE_KEYS.SITE_SETTINGS] || {};
    
    // Update specific domain
    allSiteSettings[domain] = settings;
    
    // Estimate size and check quota
    const estimatedSize = JSON.stringify(allSiteSettings).length;
    await this.ensureQuota(estimatedSize);
    
    // Save back to storage
    await storage.local.set({
      [CONSTANTS.STORAGE_KEYS.SITE_SETTINGS]: allSiteSettings
    });
    
    Logger.debug(`Saved settings for ${domain}`);
  }
  
  /**
   * Store tracker detection
   * SECURITY: Checks quota and trims history if needed
   */
  async addDetection(detection: DetectionResult): Promise<void> {
    Logger.debug('Adding detection:', detection.name);
    
    const result = await storage.local.get(CONSTANTS.STORAGE_KEYS.DETECTIONS);
    const detections: DetectionResult[] = result[CONSTANTS.STORAGE_KEYS.DETECTIONS] || [];
    
    // Add to beginning of array
    detections.unshift(detection);
    
    // Keep only last 100 detections to prevent unlimited growth
    if (detections.length > 100) {
      Logger.debug('Trimming detection history to 100 entries');
      detections.splice(100);
    }
    
    // Estimate size and check quota
    const estimatedSize = JSON.stringify(detections).length;
    try {
      await this.ensureQuota(estimatedSize);
    } catch (error) {
      // If quota exceeded, trim more aggressively
      Logger.warn('Quota low, trimming detection history more aggressively');
      detections.splice(50); // Keep only last 50
    }
    
    await storage.local.set({
      [CONSTANTS.STORAGE_KEYS.DETECTIONS]: detections
    });
    
    Logger.debug(`Detection stored (total: ${detections.length})`);
  }
  
  /**
   * Get stored detections, optionally filtered by domain
   * ENHANCEMENT: Now supports domain filtering (v0.2.0)
   */
  async getDetections(domain?: string): Promise<DetectionResult[]> {
    Logger.debug('Loading detections', domain ? `for ${domain}` : '');
    
    const result = await storage.local.get(CONSTANTS.STORAGE_KEYS.DETECTIONS);
    const allDetections: DetectionResult[] = result[CONSTANTS.STORAGE_KEYS.DETECTIONS] || [];
    
    Logger.debug(`Found ${allDetections.length} total detections`);
    
    // Filter by domain if specified
    if (domain) {
      const filtered = allDetections.filter(detection => detection.domain === domain);
      Logger.debug(`Filtered to ${filtered.length} detections for ${domain}`);
      return filtered;
    }
    
    return allDetections;
  }
  
  /**
   * Check available storage quota
   * SECURITY: Returns quota information for monitoring and cleanup
   * 
   * @returns Quota information with usage statistics
   */
  async checkStorageQuota(): Promise<StorageQuotaInfo> {
    try {
      // Chrome/Edge: quota is typically 10MB for local storage
      // Firefox: quota varies but typically 10MB
      const QUOTA_BYTES = 10 * 1024 * 1024; // 10MB
      
      // Get bytes in use
      const usage = await storage.local.getBytesInUse(null);
      const available = Math.max(0, QUOTA_BYTES - usage);
      const usagePercent = (usage / QUOTA_BYTES) * 100;
      
      const quotaInfo: StorageQuotaInfo = {
        quota: QUOTA_BYTES,
        usage,
        available,
        usagePercent
      };
      
      // Log warning if quota is low
      if (usagePercent > 90) {
        Logger.warn(`Storage quota critical: ${usagePercent.toFixed(1)}% used`);
      } else if (usagePercent > 80) {
        Logger.warn(`Storage quota high: ${usagePercent.toFixed(1)}% used`);
      }
      
      return quotaInfo;
    } catch (error) {
      Logger.error('Failed to check storage quota:', error);
      // Return conservative estimate on error
      return {
        quota: 10 * 1024 * 1024,
        usage: 0,
        available: 10 * 1024 * 1024,
        usagePercent: 0
      };
    }
  }
  
  /**
   * Ensure sufficient quota before operation
   * SECURITY: Prevents quota exceeded errors with proactive cleanup
   * 
   * @param requiredBytes - Estimated bytes needed for operation
   * @throws Error if quota insufficient and cleanup fails
   */
  async ensureQuota(requiredBytes: number): Promise<void> {
    const quotaInfo = await this.checkStorageQuota();
    
    // If we have enough space, proceed
    if (quotaInfo.available >= requiredBytes) {
      return;
    }
    
    // If quota is low (< 10% remaining), attempt cleanup
    if (quotaInfo.usagePercent > 90) {
      Logger.warn('Storage quota low, attempting cleanup...');
      const cleaned = await this.attemptCleanup(requiredBytes);
      
      if (!cleaned) {
        throw new Error(
          `Insufficient storage quota. Available: ${(quotaInfo.available / 1024).toFixed(0)}KB, ` +
          `Required: ${(requiredBytes / 1024).toFixed(0)}KB. Please clear old data.`
        );
      }
    } else {
      // Not enough space and quota not critical - throw error
      throw new Error(
        `Insufficient storage quota. Available: ${(quotaInfo.available / 1024).toFixed(0)}KB, ` +
        `Required: ${(requiredBytes / 1024).toFixed(0)}KB.`
      );
    }
  }
  
  /**
   * Attempt to free up storage space
   * SECURITY: Cleans up old data to make room for new operations
   * 
   * @param requiredBytes - Bytes needed after cleanup
   * @returns True if cleanup successful, false otherwise
   */
  private async attemptCleanup(requiredBytes: number): Promise<boolean> {
    try {
      // Strategy 1: Trim detection history
      const detections = await this.getDetections();
      if (detections.length > 50) {
        Logger.info(`Cleaning up detection history: ${detections.length} -> 50`);
        const trimmed = detections.slice(0, 50);
        await storage.local.set({
          [CONSTANTS.STORAGE_KEYS.DETECTIONS]: trimmed
        });
        
        // Check if we have enough space now
        const quotaInfo = await this.checkStorageQuota();
        if (quotaInfo.available >= requiredBytes) {
          return true;
        }
      }
      
      // Strategy 2: Remove old site settings (keep only last 20 domains)
      const siteSettingsResult = await storage.local.get(CONSTANTS.STORAGE_KEYS.SITE_SETTINGS);
      const allSiteSettings = siteSettingsResult[CONSTANTS.STORAGE_KEYS.SITE_SETTINGS] || {};
      const domainKeys = Object.keys(allSiteSettings);
      
      if (domainKeys.length > 20) {
        Logger.info(`Cleaning up site settings: ${domainKeys.length} -> 20`);
        // Keep only most recent 20 domains (simple strategy: keep first 20 alphabetically)
        const keptDomains = domainKeys.slice(0, 20);
        const cleanedSettings: Record<string, SiteSettings> = {};
        for (const domain of keptDomains) {
          cleanedSettings[domain] = allSiteSettings[domain];
        }
        await storage.local.set({
          [CONSTANTS.STORAGE_KEYS.SITE_SETTINGS]: cleanedSettings
        });
        
        // Check if we have enough space now
        const quotaInfo = await this.checkStorageQuota();
        if (quotaInfo.available >= requiredBytes) {
          return true;
        }
      }
      
      // Cleanup didn't free enough space
      return false;
    } catch (error) {
      Logger.error('Cleanup failed:', error);
      return false;
    }
  }
}

