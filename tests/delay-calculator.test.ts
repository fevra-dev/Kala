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
      
      expect(delay).toBeGreaterThanOrEqual(CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE - CONSTANTS.DELAY.MEDIUM_PRIVACY.VARIANCE);
      expect(delay).toBeLessThanOrEqual(CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE + CONSTANTS.DELAY.MEDIUM_PRIVACY.VARIANCE);
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
      
      calculator.setPrivacyLevel('low');
      const lowDelay = calculator.calculateDelay(context);
      
      calculator.setPrivacyLevel('high');
      const highDelay = calculator.calculateDelay(context);
      
      expect(highDelay).toBeGreaterThan(lowDelay);
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
      
      // Simulate word boundary (space after letter)
      const delayAfterSpace = calculator.calculateDelay(context, 'a', ' ');
      const delayAfterLetter = calculator.calculateDelay(context, 'a', 'b');
      
      // Word boundary should add pause
      expect(delayAfterSpace).toBeGreaterThan(delayAfterLetter);
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

