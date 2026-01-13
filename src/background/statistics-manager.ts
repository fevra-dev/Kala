import { Statistics, DetectionResult } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';
import { storage } from '../shared/browser-compat';

/**
 * Statistics Manager
 * 
 * Tracks and manages extension statistics:
 * - Trackers blocked
 * - Protection hours
 * - Sites protected
 * - Events obfuscated
 * - Privacy level usage
 * - Performance metrics
 */
export class StatisticsManager {
  private statistics: Statistics | null = null;
  
  /**
   * Initialize statistics manager
   * Load existing statistics or create new
   */
  async initialize(): Promise<void> {
    try {
      const stored = await storage.local.get(CONSTANTS.STORAGE_KEYS.STATISTICS);
      
      if (stored[CONSTANTS.STORAGE_KEYS.STATISTICS]) {
        this.statistics = stored[CONSTANTS.STORAGE_KEYS.STATISTICS] as Statistics;
        Logger.debug('Statistics loaded:', this.statistics);
      } else {
        // Initialize new statistics
        this.statistics = this.createEmptyStatistics();
        await this.save();
        Logger.info('Initialized new statistics');
      }
    } catch (error) {
      Logger.error('Failed to initialize statistics:', error);
      this.statistics = this.createEmptyStatistics();
    }
  }
  
  /**
   * Get current statistics
   */
  getStatistics(): Statistics {
    return this.statistics || this.createEmptyStatistics();
  }
  
  /**
   * Track a tracker detection
   */
  async trackDetection(detection: DetectionResult, domain: string): Promise<void> {
    if (!this.statistics) {
      await this.initialize();
    }
    
    if (!this.statistics) return;
    
    this.statistics.trackersBlocked++;
    this.statistics.trackerDetections.push({
      name: detection.name,
      domain,
      timestamp: Date.now(),
      severity: detection.severity
    });
    
    // Keep only last 1000 detections
    if (this.statistics.trackerDetections.length > 1000) {
      this.statistics.trackerDetections = this.statistics.trackerDetections.slice(-1000);
    }
    
    this.statistics.lastUpdate = Date.now();
    await this.save();
  }
  
  /**
   * Track an obfuscated event (keystroke, mouse, scroll)
   */
  async trackEvent(eventType: 'keystroke' | 'mouse' | 'scroll', processingTime: number): Promise<void> {
    if (!this.statistics) {
      await this.initialize();
    }
    
    if (!this.statistics) return;
    
    this.statistics.eventsObfuscated++;
    
    // Update performance metrics
    const totalEvents = this.statistics.eventsObfuscated;
    this.statistics.averageEventOverhead = 
      (this.statistics.averageEventOverhead * (totalEvents - 1) + processingTime) / totalEvents;
    
    if (processingTime > this.statistics.maxEventOverhead) {
      this.statistics.maxEventOverhead = processingTime;
    }
    
    this.statistics.lastUpdate = Date.now();
    await this.save();
  }
  
  /**
   * Track protection time (called periodically)
   */
  async trackProtectionTime(privacyLevel: 'low' | 'medium' | 'high', minutes: number): Promise<void> {
    if (!this.statistics) {
      await this.initialize();
    }
    
    if (!this.statistics) return;
    
    const hours = minutes / 60;
    this.statistics.protectionHours += hours;
    this.statistics.privacyLevelUsage[privacyLevel] += hours;
    
    this.statistics.lastUpdate = Date.now();
    await this.save();
  }
  
  /**
   * Track a new site being protected
   */
  async trackSite(_domain: string): Promise<void> {
    if (!this.statistics) {
      await this.initialize();
    }
    
    if (!this.statistics) return;
    
    // Check if this is a new site (simple check - could be improved)
    // For now, we'll just increment if it's been a while since last update
    const timeSinceLastUpdate = Date.now() - this.statistics.lastUpdate;
    if (timeSinceLastUpdate > 60000) { // 1 minute threshold
      this.statistics.sitesProtected++;
      this.statistics.lastUpdate = Date.now();
      await this.save();
    }
  }
  
  /**
   * Reset all statistics
   */
  async reset(): Promise<void> {
    this.statistics = this.createEmptyStatistics();
    await this.save();
    Logger.info('Statistics reset');
  }
  
  /**
   * Create empty statistics object
   */
  private createEmptyStatistics(): Statistics {
    const now = Date.now();
    return {
      trackersBlocked: 0,
      trackerDetections: [],
      protectionHours: 0,
      sitesProtected: 0,
      eventsObfuscated: 0,
      privacyLevelUsage: {
        low: 0,
        medium: 0,
        high: 0
      },
      averageEventOverhead: 0,
      maxEventOverhead: 0,
      firstUse: now,
      lastUpdate: now
    };
  }
  
  /**
   * Save statistics to storage
   */
  private async save(): Promise<void> {
    try {
      await storage.local.set({
        [CONSTANTS.STORAGE_KEYS.STATISTICS]: this.statistics
      });
    } catch (error) {
      Logger.error('Failed to save statistics:', error);
    }
  }
}

