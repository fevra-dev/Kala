import { CONSTANTS } from '../shared/constants';
import { Logger } from '../shared/logger';

/**
 * Machine Learning Evasion Patterns
 * 
 * Adds adversarial patterns that confuse ML-based trackers.
 * ML models are trained on human typing patterns, so adding
 * occasional "mistakes" and natural variations makes detection harder.
 * 
 * SECURITY: Advanced trackers use ML to classify typing patterns.
 * By adding human-like variations (mistakes, hesitations), we
 * make patterns less distinguishable from real users.
 * 
 * TECHNIQUES:
 * 1. Occasional backspace (5% chance) - mimics typos
 * 2. Natural hesitation on certain keys
 * 3. Rhythm variations
 * 4. Occasional longer pauses (thinking pauses)
 */
export class MLEvasion {
  /**
   * Probability of adding a "mistake" (typo correction)
   * 5% chance mimics real human error rate
   */
  private static readonly MISTAKE_PROBABILITY = 0.05;
  
  /**
   * Probability of adding a hesitation pause
   * 10% chance for natural thinking pauses
   */
  private static readonly HESITATION_PROBABILITY = 0.10;
  
  /**
   * Probability of adding a longer pause (thinking)
   * 3% chance for natural longer pauses
   */
  private static readonly LONG_PAUSE_PROBABILITY = 0.03;
  
  /**
   * Check if we should add a mistake (backspace correction)
   * 
   * @returns true if a mistake should be simulated
   * 
   * SECURITY: Occasional mistakes make patterns more human-like
   * and harder for ML models to classify as synthetic.
   */
  static shouldAddMistake(): boolean {
    return Math.random() < this.MISTAKE_PROBABILITY;
  }
  
  /**
   * Get delay for mistake correction
   * 
   * @returns Delay in milliseconds (200-300ms)
   * 
   * Real users take longer to correct mistakes than normal typing.
   */
  static getMistakeDelay(): number {
    // 200-300ms delay for mistake correction
    return 200 + Math.random() * 100;
  }
  
  /**
   * Check if we should add a hesitation pause
   * 
   * @param key - Current key being pressed
   * @returns true if hesitation should be added
   * 
   * Some keys naturally cause hesitation (punctuation, capitals, etc.)
   */
  static shouldAddHesitation(key: string): boolean {
    // Higher probability for certain keys
    const hesitationKeys = ['.', ',', '!', '?', ';', ':', ' '];
    const hasHesitationKey = hesitationKeys.includes(key);
    
    // Base probability, higher for hesitation keys
    const probability = hasHesitationKey 
      ? this.HESITATION_PROBABILITY * 2  // 20% for punctuation
      : this.HESITATION_PROBABILITY;     // 10% for other keys
    
    return Math.random() < probability;
  }
  
  /**
   * Get hesitation delay
   * 
   * @returns Delay in milliseconds (50-150ms)
   * 
   * Natural hesitation when thinking or pausing.
   */
  static getHesitationDelay(): number {
    // 50-150ms hesitation
    return 50 + Math.random() * 100;
  }
  
  /**
   * Check if we should add a long pause (thinking)
   * 
   * @returns true if long pause should be added
   * 
   * Occasional longer pauses mimic thinking or reading.
   */
  static shouldAddLongPause(): boolean {
    return Math.random() < this.LONG_PAUSE_PROBABILITY;
  }
  
  /**
   * Get long pause delay
   * 
   * @returns Delay in milliseconds (300-800ms)
   * 
   * Longer pauses for thinking or reading text.
   */
  static getLongPauseDelay(): number {
    // 300-800ms long pause
    return 300 + Math.random() * 500;
  }
  
  /**
   * Get rhythm variation
   * 
   * @param baseDelay - Base delay for this keystroke
   * @returns Adjusted delay with rhythm variation
   * 
   * Natural typing has rhythm variations (faster/slower bursts).
   */
  static getRhythmVariation(baseDelay: number): number {
    // ±20% rhythm variation
    const variation = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2
    return baseDelay * (1 + variation);
  }
  
  /**
   * Check if key is likely to cause hesitation
   * 
   * @param key - Key to check
   * @returns true if key typically causes hesitation
   */
  static isHesitationKey(key: string): boolean {
    const hesitationKeys = [
      '.', ',', '!', '?', ';', ':', ' ',  // Punctuation
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'  // Capitals
    ];
    return hesitationKeys.includes(key);
  }
}

