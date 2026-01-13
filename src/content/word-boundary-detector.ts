import { CONSTANTS } from '../shared/constants';

/**
 * Word Boundary Detector
 * 
 * Detects word boundaries in typing patterns to add natural pauses between words.
 * Real users type faster within words and slower between words.
 * 
 * SECURITY: This makes typing patterns more human-like and harder to fingerprint.
 * 
 * Detection methods:
 * - Space characters (obvious word boundary)
 * - Punctuation marks (.,!?;:)
 * - Capital letters after lowercase (new word)
 * - Letter to non-letter transitions
 */
export class WordBoundaryDetector {
  private recentKeys: string[] = [];
  private readonly MAX_HISTORY = 20;
  
  /**
   * Check if current keystroke is at a word boundary
   * 
   * @param previousKey - The previous key that was pressed
   * @param currentKey - The current key being pressed
   * @returns true if this is a word boundary, false otherwise
   * 
   * Word boundary indicators:
   * 1. Previous key was space
   * 2. Previous key was punctuation
   * 3. Current key is capital and previous was lowercase
   * 4. Transition from letter to non-letter (or vice versa)
   */
  isWordBoundary(previousKey: string, currentKey: string): boolean {
    // Add current key to history for future analysis
    this.recentKeys.push(currentKey);
    if (this.recentKeys.length > this.MAX_HISTORY) {
      this.recentKeys.shift();
    }
    
    // Empty keys are not boundaries
    if (!previousKey || !currentKey) {
      return false;
    }
    
    // Word boundary indicators:
    const isBoundary = 
      previousKey === ' ' ||                                    // Space = word boundary
      /[.,!?;:]/.test(previousKey) ||                           // Punctuation = word boundary
      (this.isCapital(currentKey) && this.isLowercase(previousKey)) || // Capital after lowercase = new word
      (this.isLetter(previousKey) !== this.isLetter(currentKey));     // Letter/non-letter transition
    
    return isBoundary;
  }
  
  /**
   * Check if key is a capital letter
   */
  private isCapital(key: string): boolean {
    return key.length === 1 && key >= 'A' && key <= 'Z';
  }
  
  /**
   * Check if key is a lowercase letter
   */
  private isLowercase(key: string): boolean {
    return key.length === 1 && key >= 'a' && key <= 'z';
  }
  
  /**
   * Check if key is a letter (upper or lowercase)
   */
  private isLetter(key: string): boolean {
    return /^[a-zA-Z]$/.test(key);
  }
  
  /**
   * Clear history (useful for testing or reset)
   */
  clearHistory(): void {
    this.recentKeys = [];
  }
  
  /**
   * Get recent typing pattern for analysis
   */
  getRecentPattern(): string {
    return this.recentKeys.join('');
  }
}

