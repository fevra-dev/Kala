import { StatisticsManager } from '../src/background/statistics-manager';
import { DetectionResult } from '../src/shared/types';

// Declare global for Jest/Node environment
declare const global: any;

// Mock chrome.storage with callback-style API (as used by browser-compat.ts)
const mockStorage: any = {};
const chromeStorage = {
  local: {
    // Chrome uses callback-style API
    get: jest.fn((keys: string | string[] | null, callback: (result: any) => void) => {
      const keyArray = keys === null ? Object.keys(mockStorage) : (Array.isArray(keys) ? keys : [keys]);
      const result: any = {};
      keyArray.forEach((key) => {
        result[key] = mockStorage[key];
      });
      // Call callback immediately (simulating sync behavior for tests)
      if (callback) {
        callback(result);
      }
    }),
    set: jest.fn((items: any, callback?: () => void) => {
      Object.assign(mockStorage, items);
      if (callback) {
        callback();
      }
    }),
  },
};

const chromeRuntime = {
  id: 'test-extension-id',
  lastError: null as any,
};

// Set up chrome global before tests
(global as any).chrome = { 
  storage: chromeStorage,
  runtime: chromeRuntime 
};

describe('StatisticsManager', () => {
  let manager: StatisticsManager;
  
  beforeEach(() => {
    manager = new StatisticsManager();
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    jest.clearAllMocks();
    (global as any).chrome.runtime.lastError = null;
  });
  
  describe('initialize', () => {
    it('should initialize with empty statistics if none exist', async () => {
      await manager.initialize();
      const stats = manager.getStatistics();
      
      expect(stats.trackersBlocked).toBe(0);
      expect(stats.eventsObfuscated).toBe(0);
      expect(stats.protectionHours).toBe(0);
    });
    
    it('should load existing statistics', async () => {
      const existingStats = {
        trackersBlocked: 5,
        trackerDetections: [],
        protectionHours: 10,
        sitesProtected: 3,
        eventsObfuscated: 1000,
        privacyLevelUsage: { low: 2, medium: 5, high: 3 },
        averageEventOverhead: 1.5,
        maxEventOverhead: 3.0,
        firstUse: Date.now(),
        lastUpdate: Date.now(),
      };
      
      mockStorage['kala_statistics'] = existingStats;
      await manager.initialize();
      
      const stats = manager.getStatistics();
      expect(stats.trackersBlocked).toBe(5);
      expect(stats.protectionHours).toBe(10);
    });
  });
  
  describe('trackDetection', () => {
    it('should increment tracker count', async () => {
      await manager.initialize();
      
      const detection: DetectionResult = {
        name: 'TestTracker',
        type: 'signature',
        severity: 'high',
        description: 'Test',
        confidence: 0.9,
        timestamp: Date.now(),
      };
      
      await manager.trackDetection(detection, 'example.com');
      
      const stats = manager.getStatistics();
      expect(stats.trackersBlocked).toBe(1);
      expect(stats.trackerDetections.length).toBe(1);
    });
  });
  
  describe('trackEvent', () => {
    it('should increment event count and update performance metrics', async () => {
      await manager.initialize();
      
      await manager.trackEvent('keystroke', 1.5);
      await manager.trackEvent('mouse', 2.0);
      
      const stats = manager.getStatistics();
      expect(stats.eventsObfuscated).toBe(2);
      expect(stats.averageEventOverhead).toBeCloseTo(1.75, 2);
      expect(stats.maxEventOverhead).toBe(2.0);
    });
  });
  
  describe('reset', () => {
    it('should reset all statistics', async () => {
      await manager.initialize();
      
      await manager.trackEvent('keystroke', 1.0);
      await manager.reset();
      
      const stats = manager.getStatistics();
      expect(stats.eventsObfuscated).toBe(0);
      expect(stats.trackersBlocked).toBe(0);
    });
  });
});
