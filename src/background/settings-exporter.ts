import { StorageManager } from './storage-manager';
import { Logger } from '../shared/logger';
import { CONSTANTS } from '../shared/constants';
import { storage } from '../shared/browser-compat';

/**
 * Settings Exporter/Importer
 * 
 * Handles export and import of extension settings:
 * - Global settings
 * - Per-site settings
 * - Statistics (optional)
 */
export class SettingsExporter {
  private storageManager: StorageManager;
  
  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }
  
  /**
   * Export all settings to JSON
   * 
   * @param includeStatistics - Whether to include statistics in export
   * @returns JSON string of all settings
   */
  async exportSettings(includeStatistics: boolean = false): Promise<string> {
    try {
      const globalSettings = await this.storageManager.getSettings();
      
      // Get all site settings
      const allSiteSettings: Record<string, any> = {};
      const allStorage = await storage.local.get(null);
      
      // Extract site settings (keys starting with 'bg_site_settings_')
      for (const [key, value] of Object.entries(allStorage)) {
        if (key.startsWith('bg_site_settings_')) {
          const domain = key.replace('bg_site_settings_', '');
          allSiteSettings[domain] = value;
        }
      }
      
      const exportData: any = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        globalSettings,
        siteSettings: allSiteSettings
      };
      
      if (includeStatistics) {
        const statistics = await storage.local.get(CONSTANTS.STORAGE_KEYS.STATISTICS);
        exportData.statistics = statistics[CONSTANTS.STORAGE_KEYS.STATISTICS] || null;
      }
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      Logger.error('Failed to export settings:', error);
      throw error;
    }
  }
  
  /**
   * Import settings from JSON
   * SECURITY: Validates size and checks quota before importing
   * 
   * @param jsonData - JSON string of settings to import
   * @param merge - Whether to merge with existing settings (true) or replace (false)
   * @returns Import result with counts
   */
  async importSettings(jsonData: string, merge: boolean = true): Promise<{
    success: boolean;
    globalSettingsImported: boolean;
    sitesImported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // SECURITY: Validate JSON size to prevent DoS
      if (jsonData.length > 10 * 1024 * 1024) { // 10MB limit
        errors.push('Import file too large (max 10MB)');
        return {
          success: false,
          globalSettingsImported: false,
          sitesImported: 0,
          errors
        };
      }
      
      // SECURITY: Check quota before importing
      try {
        await this.storageManager.ensureQuota(jsonData.length);
      } catch (quotaError) {
        errors.push(`Insufficient storage quota: ${quotaError instanceof Error ? quotaError.message : String(quotaError)}`);
        return {
          success: false,
          globalSettingsImported: false,
          sitesImported: 0,
          errors
        };
      }
      
      const importData = JSON.parse(jsonData);
      
      // SECURITY: Validate structure before processing
      if (!this.validateSettingsSchema(importData)) {
        errors.push('Invalid settings file format');
        return {
          success: false,
          globalSettingsImported: false,
          sitesImported: 0,
          errors
        };
      }
      
      // Validate version
      if (importData.version !== '1.0') {
        errors.push(`Unsupported export version: ${importData.version}`);
      }
      
      // Import global settings
      let globalSettingsImported = false;
      if (importData.globalSettings) {
        try {
          if (merge) {
            const existing = await this.storageManager.getSettings();
            await this.storageManager.saveSettings({
              ...existing,
              ...importData.globalSettings
            });
          } else {
            await this.storageManager.saveSettings(importData.globalSettings);
          }
          globalSettingsImported = true;
        } catch (error) {
          errors.push(`Failed to import global settings: ${error}`);
        }
      }
      
      // Import site settings
      let sitesImported = 0;
      if (importData.siteSettings) {
        for (const [domain, settings] of Object.entries(importData.siteSettings)) {
          try {
            if (merge) {
              const existing = await this.storageManager.getSiteSettings(domain);
              await this.storageManager.saveSiteSettings(domain, {
                ...existing,
                ...(settings as any)
              });
            } else {
              await this.storageManager.saveSiteSettings(domain, settings as any);
            }
            sitesImported++;
          } catch (error) {
            errors.push(`Failed to import settings for ${domain}: ${error}`);
          }
        }
      }
      
      // Import statistics (optional)
      if (importData.statistics && !merge) {
        try {
          await storage.local.set({
            [CONSTANTS.STORAGE_KEYS.STATISTICS]: importData.statistics
          });
        } catch (error) {
          errors.push(`Failed to import statistics: ${error}`);
        }
      }
      
      return {
        success: errors.length === 0,
        globalSettingsImported,
        sitesImported,
        errors
      };
    } catch (error) {
      Logger.error('Failed to import settings:', error);
      errors.push(`Parse error: ${error}`);
      return {
        success: false,
        globalSettingsImported: false,
        sitesImported: 0,
        errors
      };
    }
  }
  
  /**
   * Download settings as JSON file
   */
  async downloadSettings(includeStatistics: boolean = false): Promise<void> {
    const jsonData = await this.exportSettings(includeStatistics);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kala-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Validate settings schema before import
   * SECURITY: Prevents processing of malicious or malformed data
   */
  private validateSettingsSchema(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    // Must have version
    if (typeof data.version !== 'string') {
      return false;
    }
    
    // Optional fields must be correct type
    if (data.globalSettings !== undefined && typeof data.globalSettings !== 'object') {
      return false;
    }
    
    if (data.siteSettings !== undefined && typeof data.siteSettings !== 'object') {
      return false;
    }
    
    if (data.statistics !== undefined && typeof data.statistics !== 'object') {
      return false;
    }
    
    // Validate site settings structure
    if (data.siteSettings) {
      for (const [domain, settings] of Object.entries(data.siteSettings)) {
        // Domain must be string
        if (typeof domain !== 'string' || domain.length > 253) { // Max domain length
          return false;
        }
        // Settings must be object
        if (typeof settings !== 'object' || settings === null) {
          return false;
        }
      }
    }
    
    return true;
  }
}

