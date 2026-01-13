/**
 * Digraph Pattern Noise Generator
 * 
 * Adds targeted noise for common key pairs (digraphs) that trackers analyze.
 * Real users have consistent timing patterns for common letter pairs.
 * 
 * SECURITY: Common digraphs like "th", "he", "in" have predictable timing.
 * Adding noise to these patterns makes fingerprinting harder.
 * 
 * Based on research showing digraph timing is a strong fingerprinting signal.
 */
export class DigraphNoiseGenerator {
  /**
   * Common English digraphs and their typical timing patterns
   * Values based on research on keystroke dynamics
   */
  private readonly COMMON_DIGRAPHS: Record<string, { baseDelay: number; variance: number }> = {
    // Most common digraphs in English
    'th': { baseDelay: 80, variance: 30 },   // Very common
    'he': { baseDelay: 75, variance: 25 },
    'in': { baseDelay: 70, variance: 20 },
    'er': { baseDelay: 72, variance: 22 },
    'an': { baseDelay: 68, variance: 18 },
    're': { baseDelay: 74, variance: 24 },
    'ed': { baseDelay: 76, variance: 26 },
    'nd': { baseDelay: 78, variance: 28 },
    'at': { baseDelay: 70, variance: 20 },
    'on': { baseDelay: 72, variance: 22 },
    'en': { baseDelay: 69, variance: 19 },
    'ou': { baseDelay: 73, variance: 23 },
    'it': { baseDelay: 71, variance: 21 },
    'is': { baseDelay: 70, variance: 20 },
    'or': { baseDelay: 72, variance: 22 },
    'ti': { baseDelay: 75, variance: 25 },
    'as': { baseDelay: 68, variance: 18 },
    'to': { baseDelay: 73, variance: 23 },
    'of': { baseDelay: 74, variance: 24 },
    'al': { baseDelay: 69, variance: 19 }
  };
  
  /**
   * Get additional delay for a digraph pattern
   * 
   * @param previousKey - Previous key pressed
   * @param currentKey - Current key being pressed
   * @returns Additional delay in milliseconds (0 if not a common digraph)
   * 
   * Uses Gaussian distribution for realistic noise patterns
   */
  getDigraphDelay(previousKey: string, currentKey: string): number {
    // Normalize keys to lowercase for matching
    const digraph = (previousKey.toLowerCase() + currentKey.toLowerCase());
    
    // Check if this is a known common digraph
    const pattern = this.COMMON_DIGRAPHS[digraph];
    
    if (!pattern) {
      // Not a common digraph, no additional delay
      return 0;
    }
    
    // Generate Gaussian-distributed noise for this digraph
    // This makes the pattern less predictable while maintaining realism
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Scale to variance (standard deviation = variance/3 for 99.7% within range)
    const noise = z * (pattern.variance / 3);
    
    // Calculate delay adjustment (can be positive or negative)
    const delayAdjustment = pattern.baseDelay + noise;
    
    // Clamp to reasonable range (±50% of base delay)
    const minAdjustment = pattern.baseDelay - (pattern.variance * 1.5);
    const maxAdjustment = pattern.baseDelay + (pattern.variance * 1.5);
    
    return Math.max(minAdjustment, Math.min(maxAdjustment, delayAdjustment));
  }
  
  /**
   * Check if a key pair is a common digraph
   * 
   * @param previousKey - Previous key
   * @param currentKey - Current key
   * @returns true if this is a known common digraph
   */
  isCommonDigraph(previousKey: string, currentKey: string): boolean {
    const digraph = (previousKey.toLowerCase() + currentKey.toLowerCase());
    return digraph in this.COMMON_DIGRAPHS;
  }
  
  /**
   * Get all known common digraphs (for testing/debugging)
   */
  getKnownDigraphs(): string[] {
    return Object.keys(this.COMMON_DIGRAPHS);
  }
}

