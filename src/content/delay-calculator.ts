import { PrivacyLevel, InputContext } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { WordBoundaryDetector } from './word-boundary-detector';
import { Logger } from '../shared/logger';
import { DigraphNoiseGenerator } from './digraph-noise-generator';
import { SessionRandomizer } from '../shared/session-randomizer';
import { MLEvasion } from './ml-evasion';
import { FatigueModel } from './fatigue-model';

/**
 * Calculates obfuscation delay for each keystroke
 * 
 * DELAY CALCULATION FORMULA:
 * total_delay = base_delay + random_noise + context_adjustment
 * 
 * Where:
 * - base_delay: Determined by privacy level (30-80ms)
 * - random_noise: Uniform random within variance range (20-70ms)
 * - context_adjustment: Additive modifier for context (-20 to +10ms)
 * 
 * ACADEMIC BASIS:
 * Research shows 50-200ms delays reduce identification from 90% to 20-30%
 * (Source: Kloak system, academic papers)
 */
export class DelayCalculator {
  private privacyLevel: PrivacyLevel = 'medium';
  private wordBoundaryDetector: WordBoundaryDetector;
  private digraphNoiseGenerator: DigraphNoiseGenerator;
  private fatigueModel: FatigueModel;
  
  constructor() {
    this.wordBoundaryDetector = new WordBoundaryDetector();
    this.digraphNoiseGenerator = new DigraphNoiseGenerator();
    this.fatigueModel = new FatigueModel();
    
    // Initialize session randomizer
    SessionRandomizer.initialize();
  }
  
  /**
   * Update privacy level (called when user changes slider)
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    Logger.info(`Privacy level changed to: ${level}`);
    this.privacyLevel = level;
  }
  
  /**
   * Calculate delay for a keystroke
   * 
   * INPUT CONTRACT:
   * @param context - Input context (gaming, form, etc)
   * @param previousKey - Previous key pressed (for word-boundary detection)
   * @param currentKey - Current key being pressed (for word-boundary detection)
   * 
   * OUTPUT CONTRACT:
   * @returns Delay in milliseconds (always >= CONSTANTS.DELAY.MIN)
   * 
   * EXAMPLE OUTPUTS:
   * - Gaming context, low privacy: ~20-40ms (responsive)
   * - Form field, medium privacy: ~60-110ms (balanced)
   * - Text editor, high privacy: ~85-155ms (maximum obfuscation)
   * - Word boundary: +50-150ms additional pause
   */
  calculateDelay(context: InputContext, previousKey?: string, currentKey?: string): number {
    // Get base delay for privacy level
    const baseDelay = this.getBaseDelay();
    
    // Add random noise for obfuscation
    const randomNoise = this.getRandomNoise();
    
    // Adjust for input context
    const contextAdjustment = this.getContextAdjustment(context);
    
    // Word-boundary adjustment (add natural pause between words)
    let wordBoundaryAdjustment = 0;
    if (CONSTANTS.WORD_BOUNDARY.ENABLED && previousKey && currentKey) {
      const isBoundary = this.wordBoundaryDetector.isWordBoundary(previousKey, currentKey);
      
      if (isBoundary) {
        // Natural pause between words: 50-150ms using Gaussian distribution
        const baseWordPause = CONSTANTS.WORD_BOUNDARY.BASE_PAUSE_MS;
        const wordPauseVariance = CONSTANTS.WORD_BOUNDARY.VARIANCE_MS;
        
        // Gaussian distribution for word pause (more realistic than uniform)
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        wordBoundaryAdjustment = baseWordPause + (z * (wordPauseVariance / 3));
        
        // Clamp to reasonable range
        wordBoundaryAdjustment = Math.max(
          CONSTANTS.WORD_BOUNDARY.MIN_PAUSE_MS,
          Math.min(CONSTANTS.WORD_BOUNDARY.MAX_PAUSE_MS, wordBoundaryAdjustment)
        );
      }
    }
    
    // Digraph pattern noise (for common key pairs)
    let digraphAdjustment = 0;
    if (CONSTANTS.ADVANCED_PROTECTIONS.DIGRAPH_NOISE && previousKey && currentKey) {
      digraphAdjustment = this.digraphNoiseGenerator.getDigraphDelay(previousKey, currentKey);
    }
    
    // Session-based randomization (consistent within session, varies between sessions)
    let sessionVariation = 0;
    let sessionMultiplier = 1.0;
    if (CONSTANTS.ADVANCED_PROTECTIONS.SESSION_RANDOMIZATION) {
      sessionVariation = SessionRandomizer.getSessionVariation();
      sessionMultiplier = SessionRandomizer.getSessionMultiplier();
    }
    
    // ML evasion patterns (hesitation, rhythm variation)
    let mlEvasionAdjustment = 0;
    if (CONSTANTS.ADVANCED_PROTECTIONS.ML_EVASION && currentKey) {
      // Check for hesitation
      if (MLEvasion.shouldAddHesitation(currentKey)) {
        mlEvasionAdjustment += MLEvasion.getHesitationDelay();
      }
      
      // Check for long pause (thinking)
      if (MLEvasion.shouldAddLongPause()) {
        mlEvasionAdjustment += MLEvasion.getLongPauseDelay();
      }
    }
    
    // Fatigue modeling - simulates natural human fatigue patterns
    let fatigueAdjustment = 0;
    if (CONSTANTS.EVASION.FATIGUE_MODELING) {
      this.fatigueModel.recordKeystroke();
      fatigueAdjustment = this.fatigueModel.getTotalFatigueAdjustment();
    }
    
    // Calculate base total before ML evasion rhythm variation
    const baseTotal = baseDelay + randomNoise + contextAdjustment + wordBoundaryAdjustment + digraphAdjustment + fatigueAdjustment;
    
    // Apply session multiplier
    const sessionAdjusted = baseTotal * sessionMultiplier + sessionVariation;
    
    // Apply ML evasion rhythm variation
    let rhythmAdjusted = sessionAdjusted;
    if (CONSTANTS.ADVANCED_PROTECTIONS.ML_EVASION) {
      rhythmAdjusted = MLEvasion.getRhythmVariation(sessionAdjusted);
    }
    
    // Calculate total with ML evasion adjustments
    const totalDelay = rhythmAdjusted + mlEvasionAdjustment;
    
    // Add microsecond-level jitter to prevent perfect timing detection
    // Real typing has microsecond variations that trackers can detect
    let finalDelay = totalDelay;
    if (CONSTANTS.EVASION.ADD_MICRO_JITTER) {
      const microJitter = (Math.random() - 0.5) * CONSTANTS.EVASION.MICRO_JITTER_RANGE_MS;
      finalDelay += microJitter;
    }
    
    // Clamp to minimum viable delay
    finalDelay = Math.max(CONSTANTS.DELAY.MIN, finalDelay);
    
    // EFFICIENCY: Lazy evaluation for debug logs (only evaluated if DEBUG enabled)
    if (CONSTANTS.DEBUG.ENABLED) {
      Logger.debug(() => ({
        baseDelay,
        randomNoise: randomNoise.toFixed(2),
        contextAdjustment,
        wordBoundaryAdjustment: wordBoundaryAdjustment.toFixed(2),
        digraphAdjustment: digraphAdjustment.toFixed(2),
        fatigueAdjustment: fatigueAdjustment.toFixed(2),
        sessionVariation: sessionVariation.toFixed(2),
        sessionMultiplier: sessionMultiplier.toFixed(3),
        mlEvasionAdjustment: mlEvasionAdjustment.toFixed(2),
        totalDelay: totalDelay.toFixed(2),
        finalDelay: finalDelay.toFixed(2),
        context: context.isGaming ? 'gaming' : context.isFormField ? 'form' : 'default',
        isWordBoundary: wordBoundaryAdjustment > 0,
        isCommonDigraph: digraphAdjustment !== 0,
        fatigueLevel: this.fatigueModel.getState().fatigueLevel.toFixed(2)
      }));
    }
    
    return finalDelay;
  }
  
  /**
   * Get base delay for current privacy level
   */
  private getBaseDelay(): number {
    switch (this.privacyLevel) {
      case 'low':
        return CONSTANTS.DELAY.LOW_PRIVACY.BASE;
      case 'medium':
        return CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE;
      case 'high':
        return CONSTANTS.DELAY.HIGH_PRIVACY.BASE;
    }
  }
  
  /**
   * Generate random noise within variance range
   * Uses log-normal or Gaussian distribution for realistic human patterns
   * 
   * Log-normal is more accurate for human reaction times:
   * - Always positive (delays can't be negative)
   * - Right-skewed (occasional longer delays are natural)
   * - Matches academic research on inter-key intervals
   * 
   * Academic basis: "Log-normal distribution of inter-key intervals" (2018)
   */
  private getRandomNoise(): number {
    let variance: number;
    
    switch (this.privacyLevel) {
      case 'low':
        variance = CONSTANTS.DELAY.LOW_PRIVACY.VARIANCE;
        break;
      case 'medium':
        variance = CONSTANTS.DELAY.MEDIUM_PRIVACY.VARIANCE;
        break;
      case 'high':
        variance = CONSTANTS.DELAY.HIGH_PRIVACY.VARIANCE;
        break;
    }
    
    // Use log-normal distribution for most realistic human patterns
    if (CONSTANTS.EVASION.USE_LOGNORMAL_DISTRIBUTION) {
      return this.generateLogNormalNoise(variance);
    }
    
    if (CONSTANTS.EVASION.USE_GAUSSIAN_DISTRIBUTION) {
      // Box-Muller transform for Gaussian distribution
      // More realistic than uniform - matches human typing patterns better
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Scale to variance (standard deviation = variance/3 for 99.7% within range)
      const gaussianNoise = z * (variance / 3);
      
      // Clamp to reasonable range (prevent extreme outliers)
      return Math.max(-variance, Math.min(variance, gaussianNoise));
    } else {
      // Fallback to uniform distribution
      return Math.random() * variance;
    }
  }
  
  /**
   * Generate log-normal noise
   * Log-normal distribution is ideal for human timing:
   * - Always positive (no negative delays)
   * - Right-skewed (occasional longer pauses are natural)
   * - Median is the typical value, mean is slightly higher
   * 
   * @param variance - Target variance in milliseconds
   * @returns Noise value in milliseconds (always positive, centered around 0)
   */
  private generateLogNormalNoise(variance: number): number {
    // Log-normal parameters
    // We want median ≈ 0, so we subtract median after generation
    const sigma = 0.5;  // Controls spread (higher = more variation)
    const mu = 0;       // Log of median
    
    // Generate log-normal using Box-Muller
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Convert to log-normal
    const logNormal = Math.exp(mu + sigma * z);
    
    // Scale to desired variance and center around 0
    // Median of log-normal with mu=0, sigma=0.5 is e^0 = 1
    const scaled = (logNormal - 1) * variance;
    
    // Clamp to prevent extreme outliers (keep within ±2*variance)
    return Math.max(-variance, Math.min(variance * 2, scaled));
  }
  
  /**
   * Calculate context-based adjustment
   * 
   * CONTEXT PRIORITY (from highest to lowest):
   * 1. Gaming: Minimize latency for responsiveness
   * 2. Password: No adjustment (security-sensitive)
   * 3. Search: Minimize latency for UX
   * 4. Form: Slight increase acceptable
   * 5. Text editor: Minimal increase
   * 6. Default: No adjustment
   */
  private getContextAdjustment(context: InputContext): number {
    if (context.isGaming) {
      return CONSTANTS.CONTEXT_ADJUSTMENT.GAMING;
    }
    
    if (context.isPasswordField) {
      return CONSTANTS.CONTEXT_ADJUSTMENT.PASSWORD_FIELD;
    }
    
    if (context.isSearchField) {
      return CONSTANTS.CONTEXT_ADJUSTMENT.SEARCH_FIELD;
    }
    
    if (context.isFormField) {
      return CONSTANTS.CONTEXT_ADJUSTMENT.FORM_FIELD;
    }
    
    if (context.isTextEditor) {
      return CONSTANTS.CONTEXT_ADJUSTMENT.TEXT_EDITOR;
    }
    
    return 0;  // No adjustment for default context
  }
}

