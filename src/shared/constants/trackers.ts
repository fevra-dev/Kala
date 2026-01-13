import { TrackerSignature } from '../types';

/**
 * Tracker detection configuration
 */
export const TRACKER_DETECTION = {
  MAX_EVENT_LISTENERS: 5,     // Suspicious if exceeded
  SIGNATURE_CHECK_INTERVAL_MS: 5000  // Scan frequency
};

/**
 * Known behavioral tracker signatures
 * Based on commercial products: BioCatch, BehavioSec, TypingDNA
 */
export const KNOWN_TRACKERS: TrackerSignature[] = [
  {
    name: 'BioCatch',
    patterns: {
      scriptUrls: ['biocatch.com', 'biocatch-cdn'],
      functionNames: ['BioCatch', 'BC_SDK']
    },
    severity: 'high'
  },
  {
    name: 'BehavioSec',
    patterns: {
      scriptUrls: ['behaviosec.com'],
      functionNames: ['BehavioSec']
    },
    severity: 'high'
  },
  {
    name: 'TypingDNA',
    patterns: {
      scriptUrls: ['typingdna.com'],
      functionNames: ['TypingDNA', 'tdna']
    },
    severity: 'medium'
  },
  {
    name: 'Generic Behavioral Tracker',
    patterns: {
      eventListeners: [
        { type: 'keydown', minCount: 5 },
        { type: 'keyup', minCount: 5 }
      ]
    },
    severity: 'medium'
  }
];

