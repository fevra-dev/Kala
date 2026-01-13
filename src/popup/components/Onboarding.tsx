import React, { useState, useEffect } from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { PrivacyLevel } from '../../shared/types';
import { Logger } from '../../shared/logger';
import { storage, tabs } from '../../shared/browser-compat';
import { getThemeColors } from '../theme';

/**
 * Onboarding Flow Component
 * 
 * First-run experience for new users:
 * - Welcome screen
 * - Feature explanation
 * - Privacy level recommendation
 * - Quick setup
 */
export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('medium');
  
  // Use dark theme (default)
  const colors = getThemeColors('dark');
  
  const totalSteps = 4;
  
  /**
   * Check if onboarding has been completed
   */
  useEffect(() => {
    checkOnboardingStatus();
  }, []);
  
  const checkOnboardingStatus = async () => {
    try {
      const result = await storage.local.get('kala_onboarding_completed');
      if (result.kala_onboarding_completed) {
        // Onboarding already completed, skip
        onComplete();
      }
    } catch (error) {
      Logger.error('Failed to check onboarding status:', error);
    }
  };
  
  /**
   * Complete onboarding
   */
  const completeOnboarding = async () => {
    try {
      // Save onboarding completion
      await storage.local.set({ kala_onboarding_completed: true });
      
      // Apply recommended privacy level
      const allTabs = await tabs.query({ active: true, currentWindow: true });
      const activeTab = allTabs[0];
      if (activeTab?.url) {
        const url = new URL(activeTab.url);
        const domain = url.hostname;
        
        await Messaging.sendToBackground({
          type: MessageType.UPDATE_SITE_SETTINGS,
          payload: {
            domain,
            settings: {
              enabled: true,
              privacyLevel,
              whitelisted: false
            }
          }
        });
      }
      
      onComplete();
    } catch (error) {
      Logger.error('Failed to complete onboarding:', error);
      onComplete(); // Complete anyway
    }
  };
  
  /**
   * Skip onboarding
   */
  const handleSkip = async () => {
    await chrome.storage.local.set({ kala_onboarding_completed: true });
    onComplete();
  };
  
  /**
   * Next step
   */
  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };
  
  /**
   * Previous step
   */
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '400px',
      margin: '0 auto',
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: '100vh'
    }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '12px',
          color: colors.textSecondary
        }}>
          <span>Step {step} of {totalSteps}</span>
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            Skip
          </button>
        </div>
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: colors.surface,
          borderRadius: '2px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            width: `${(step / totalSteps) * 100}%`,
            height: '100%',
            backgroundColor: colors.primary,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
      
      {/* Step Content */}
      <div style={{ minHeight: '300px' }}>
        {step === 1 && <WelcomeStep colors={colors} />}
        {step === 2 && <FeaturesStep colors={colors} />}
        {step === 3 && <PrivacyLevelStep 
          privacyLevel={privacyLevel} 
          setPrivacyLevel={setPrivacyLevel}
          colors={colors}
        />}
        {step === 4 && <CompleteStep colors={colors} />}
      </div>
      
      {/* Navigation Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '24px',
        gap: '12px'
      }}>
        <button
          onClick={prevStep}
          disabled={step === 1}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: step === 1 ? colors.surface : colors.surface,
            color: step === 1 ? colors.textSecondary : colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: step === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        <button
          onClick={nextStep}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {step === totalSteps ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
};

/**
 * Welcome Step
 */
const WelcomeStep: React.FC<{ colors: any }> = ({ colors }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        <img 
          src={chrome.runtime.getURL('assets/logo.png')} 
          alt="Kala" 
          style={{ 
            width: '64px', 
            height: '64px',
            objectFit: 'contain'
          }} 
        />
      </div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
        Welcome to Kala
      </h2>
      <p style={{ 
        margin: '0 0 24px 0', 
        fontSize: '14px', 
        color: colors.textSecondary,
        lineHeight: '1.6'
      }}>
        Kala protects your privacy by obfuscating your behavioral patterns—keystroke timing, 
        mouse movements, and scroll patterns—preventing websites from creating unique 
        "behavioral fingerprints" that can identify you across the web.
      </p>
      <div style={{
        padding: '16px',
        backgroundColor: colors.primary + '20',
        borderRadius: '8px',
        fontSize: '13px',
        color: colors.primary,
        textAlign: 'left',
        border: `1px solid ${colors.primary}40`
      }}>
        <strong>🔒 Privacy First:</strong> All processing happens locally on your device. 
        No data ever leaves your browser.
      </div>
    </div>
  );
};

/**
 * Features Step
 */
const FeaturesStep: React.FC<{ colors: any }> = ({ colors }) => {
  const features = [
    { icon: '⌨️', title: 'Keystroke Obfuscation', desc: 'Intelligent delay injection with natural patterns' },
    { icon: '🖱️', title: 'Mouse Movement Protection', desc: 'Gaussian noise on coordinates and velocity' },
    { icon: '📜', title: 'Scroll Pattern Obfuscation', desc: 'Timing and velocity variation for natural scrolling' },
    { icon: '🔍', title: 'Tracker Detection', desc: 'Identifies behavioral tracking scripts in real-time' }
  ];
  
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold', color: colors.text }}>
        Key Features
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {features.map((feature, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            backgroundColor: colors.surface,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '24px' }}>{feature.icon}</div>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px', color: colors.text }}>
                {feature.title}
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {feature.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Privacy Level Step
 */
interface PrivacyLevelStepProps {
  privacyLevel: PrivacyLevel;
  setPrivacyLevel: (level: PrivacyLevel) => void;
  colors: any;
}

const PrivacyLevelStep: React.FC<PrivacyLevelStepProps> = ({ 
  privacyLevel, 
  setPrivacyLevel,
  colors
}) => {
  const levels = [
    {
      level: 'low' as PrivacyLevel,
      title: 'Low',
      subtitle: 'Gaming-Friendly',
      desc: 'Minimal delays (30-50ms). Best for gaming and responsive applications.',
      delay: '30-50ms'
    },
    {
      level: 'medium' as PrivacyLevel,
      title: 'Medium',
      subtitle: 'Recommended',
      desc: 'Balanced protection (50-100ms). Good for most users.',
      delay: '50-100ms'
    },
    {
      level: 'high' as PrivacyLevel,
      title: 'High',
      subtitle: 'Maximum Protection',
      desc: 'Maximum obfuscation (80-150ms). Best privacy, slight delay.',
      delay: '80-150ms'
    }
  ];
  
  return (
    <div>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: colors.text }}>
        Choose Privacy Level
      </h2>
      <p style={{ 
        margin: '0 0 20px 0', 
        fontSize: '13px', 
        color: colors.textSecondary
      }}>
        You can change this anytime. We recommend <strong>Medium</strong> for most users.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {levels.map((level) => (
          <div
            key={level.level}
            onClick={() => setPrivacyLevel(level.level)}
            style={{
              padding: '16px',
              border: `2px solid ${privacyLevel === level.level ? colors.primary : colors.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: privacyLevel === level.level ? colors.primary + '20' : colors.surface,
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: colors.text }}>
                  {level.title}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  {level.subtitle}
                </div>
              </div>
              <div style={{
                padding: '4px 8px',
                backgroundColor: privacyLevel === level.level ? colors.primary : colors.border,
                color: privacyLevel === level.level ? 'white' : colors.textSecondary,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {level.delay}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: colors.textSecondary }}>
              {level.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Complete Step
 */
const CompleteStep: React.FC<{ colors: any }> = ({ colors }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>
        ✅
      </div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
        You're All Set!
      </h2>
      <p style={{ 
        margin: '0 0 24px 0', 
        fontSize: '14px', 
        color: colors.textSecondary,
        lineHeight: '1.6'
      }}>
        Kala is now protecting your privacy. The extension will automatically obfuscate 
        your behavioral patterns on all websites.
      </p>
      <div style={{
        padding: '16px',
        backgroundColor: colors.surface,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        fontSize: '13px',
        textAlign: 'left',
        color: colors.textSecondary
      }}>
        <strong style={{ color: colors.text }}>💡 Tip:</strong> Click the extension icon anytime to view statistics, 
        adjust settings, or see detected trackers.
      </div>
    </div>
  );
};

