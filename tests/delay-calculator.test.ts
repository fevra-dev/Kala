import { DelayCalculator } from '../src/content/delay-calculator';
import { InputContext, PrivacyLevel } from '../src/shared/types';
import { CONSTANTS } from '../src/shared/constants';

describe('DelayCalculator', () => {
  let calculator: DelayCalculator;
  
  beforeEach(() => {
    calculator = new DelayCalculator();
  });
  
  describe('calculateDelay', () => {
    it('should return delay within expected range for medium privacy', () => {
      const context: InputContext = {
        isGaming: false,
        isFormField: true,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'input',
      };
      
      const delay = calculator.calculateDelay(context);
      
      // Delay should be at least the minimum
      expect(delay).toBeGreaterThanOrEqual(CONSTANTS.DELAY.MIN);
      
      // Delay should not exceed a reasonable maximum (accounting for all adjustments)
      // Base + variance + context + session multiplier + micro jitter
      expect(delay).toBeLessThanOrEqual(200);
    });
    
    it('should reduce delay for gaming context', () => {
      const gamingContext: InputContext = {
        isGaming: true,
        isFormField: false,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'canvas',
      };
      
      const normalContext: InputContext = {
        isGaming: false,
        isFormField: false,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'div',
      };
      
      // Average multiple samples to reduce randomness impact
      let totalGaming = 0;
      let totalNormal = 0;
      const samples = 100;
      
      for (let i = 0; i < samples; i++) {
        totalGaming += calculator.calculateDelay(gamingContext);
        totalNormal += calculator.calculateDelay(normalContext);
      }
      
      const avgGamingDelay = totalGaming / samples;
      const avgNormalDelay = totalNormal / samples;
      
      // Gaming context should have lower average delay
      expect(avgGamingDelay).toBeLessThanOrEqual(avgNormalDelay);
    });
    
    it('should adjust delay based on privacy level', () => {
      const context: InputContext = {
        isGaming: false,
        isFormField: true,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'input',
      };
      
      // Average multiple samples to reduce randomness impact
      const samples = 100;
      let totalLow = 0;
      let totalHigh = 0;
      
      calculator.setPrivacyLevel('low');
      for (let i = 0; i < samples; i++) {
        totalLow += calculator.calculateDelay(context);
      }
      
      calculator.setPrivacyLevel('high');
      for (let i = 0; i < samples; i++) {
        totalHigh += calculator.calculateDelay(context);
      }
      
      const avgLowDelay = totalLow / samples;
      const avgHighDelay = totalHigh / samples;
      
      expect(avgHighDelay).toBeGreaterThan(avgLowDelay);
    });
    
    it('should add word boundary pause', () => {
      const context: InputContext = {
        isGaming: false,
        isFormField: true,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'input',
      };
      
      // Average multiple samples to reduce randomness impact
      let totalAfterSpace = 0;
      let totalAfterLetter = 0;
      const samples = 100;
      
      for (let i = 0; i < samples; i++) {
        totalAfterSpace += calculator.calculateDelay(context, 'a', ' ');
        totalAfterLetter += calculator.calculateDelay(context, 'a', 'b');
      }
      
      const avgDelayAfterSpace = totalAfterSpace / samples;
      const avgDelayAfterLetter = totalAfterLetter / samples;
      
      // Word boundary should add pause (on average)
      expect(avgDelayAfterSpace).toBeGreaterThan(avgDelayAfterLetter);
    });
  });
  
  describe('setPrivacyLevel', () => {
    it('should update privacy level', () => {
      calculator.setPrivacyLevel('high');
      // Privacy level is internal, test via delay calculation
      const context: InputContext = {
        isGaming: false,
        isFormField: true,
        isSearchField: false,
        isPasswordField: false,
        isTextEditor: false,
        elementType: 'input',
      };
      
      const delay = calculator.calculateDelay(context);
      expect(delay).toBeGreaterThan(CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE);
    });
  });
});

