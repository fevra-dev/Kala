import React, { useState, useEffect } from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { Logger } from '../../shared/logger';
import { CONSTANTS } from '../../shared/constants';
import { ThemeColors, getThemeColors } from '../theme';

/**
 * Advanced Settings Panel
 * 
 * Provides expert-level controls for power users:
 * - Custom delay ranges
 * - ML evasion controls
 * - Digraph noise tuning
 * - Session randomization settings
 * - Performance monitoring controls
 * 
 * @param colors - Theme colors for dark/light mode
 */
export const AdvancedSettings: React.FC<{ colors?: ThemeColors }> = ({ colors }) => {
  const themeColors = colors || getThemeColors('dark');
  const [customDelayMin, setCustomDelayMin] = useState<number>(CONSTANTS.DELAY.MIN);
  const [customDelayMax, setCustomDelayMax] = useState<number>(CONSTANTS.DELAY.MAX);
  const [mlEvasionEnabled, setMlEvasionEnabled] = useState<boolean>(CONSTANTS.ADVANCED_PROTECTIONS.ML_EVASION);
  const [digraphNoiseEnabled, setDigraphNoiseEnabled] = useState<boolean>(CONSTANTS.ADVANCED_PROTECTIONS.DIGRAPH_NOISE);
  const [sessionRandomizationEnabled, setSessionRandomizationEnabled] = useState<boolean>(CONSTANTS.ADVANCED_PROTECTIONS.SESSION_RANDOMIZATION);
  const [webWorkerProtectionEnabled, setWebWorkerProtectionEnabled] = useState<boolean>(CONSTANTS.ADVANCED_PROTECTIONS.WEBWORKER_PROTECTION);
  const [gaussianDistributionEnabled, setGaussianDistributionEnabled] = useState<boolean>(CONSTANTS.EVASION.USE_GAUSSIAN_DISTRIBUTION);
  const [microJitterEnabled, setMicroJitterEnabled] = useState<boolean>(CONSTANTS.EVASION.ADD_MICRO_JITTER);
  const [performanceCoarseningEnabled, setPerformanceCoarseningEnabled] = useState<boolean>(CONSTANTS.EVASION.COARSEN_PERFORMANCE_NOW);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.GET_SETTINGS,
        payload: {}
      });
      
      if (response.settings) {
        // Load custom delay ranges
        if (response.settings.customDelayMin !== undefined) {
          setCustomDelayMin(response.settings.customDelayMin);
        }
        if (response.settings.customDelayMax !== undefined) {
          setCustomDelayMax(response.settings.customDelayMax);
        }
        
        // Load advanced protection settings
        if (response.settings.advancedProtections) {
          const ap = response.settings.advancedProtections;
          if (ap.mlEvasion !== undefined) setMlEvasionEnabled(ap.mlEvasion);
          if (ap.digraphNoise !== undefined) setDigraphNoiseEnabled(ap.digraphNoise);
          if (ap.sessionRandomization !== undefined) setSessionRandomizationEnabled(ap.sessionRandomization);
          if (ap.webworkerProtection !== undefined) setWebWorkerProtectionEnabled(ap.webworkerProtection);
          if (ap.gaussianDistribution !== undefined) setGaussianDistributionEnabled(ap.gaussianDistribution);
          if (ap.microJitter !== undefined) setMicroJitterEnabled(ap.microJitter);
          if (ap.performanceCoarsening !== undefined) setPerformanceCoarseningEnabled(ap.performanceCoarsening);
        }
      }
    } catch (error) {
      Logger.error('Failed to load advanced settings:', error);
    }
  };
  
  const saveSettings = async () => {
    try {
      Logger.info('Saving advanced settings...');
      
      // Prepare settings payload
      const payload = {
        customDelayMin,
        customDelayMax,
        advancedProtections: {
          mlEvasion: mlEvasionEnabled,
          digraphNoise: digraphNoiseEnabled,
          sessionRandomization: sessionRandomizationEnabled,
          webworkerProtection: webWorkerProtectionEnabled,
          gaussianDistribution: gaussianDistributionEnabled,
          microJitter: microJitterEnabled,
          performanceCoarsening: performanceCoarseningEnabled
        }
      };
      
      // Send update request
      const response = await Messaging.sendToBackground({
        type: MessageType.UPDATE_SETTINGS,
        payload
      });
      
      if (response.success) {
        Logger.info('Advanced settings saved successfully');
        // Show success feedback (could add a toast notification here)
        alert('Advanced settings saved! Extension reload may be required for some changes to take effect.');
      } else {
        Logger.error('Failed to save advanced settings:', response.error);
        alert(`Failed to save settings: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      Logger.error('Failed to save advanced settings:', error);
      alert(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div style={{ padding: '16px', color: themeColors.text }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: themeColors.text }}>
        ⚙️ Advanced Settings
      </h3>
      
      <p style={{ 
        margin: '0 0 20px 0', 
        fontSize: '12px', 
        color: themeColors.textSecondary,
        fontStyle: 'italic'
      }}>
        Expert-level controls. Modify with caution.
      </p>
      
      {/* Custom Delay Range */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Custom Delay Range
        </h4>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: themeColors.textSecondary }}>
              Minimum (ms)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={customDelayMin}
              onChange={(e) => setCustomDelayMin(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${themeColors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: themeColors.surface,
                color: themeColors.text
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: themeColors.textSecondary }}>
              Maximum (ms)
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={customDelayMax}
              onChange={(e) => setCustomDelayMax(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${themeColors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: themeColors.surface,
                color: themeColors.text
              }}
            />
          </div>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: themeColors.textSecondary }}>
          Default: {CONSTANTS.DELAY.MIN}-{CONSTANTS.DELAY.MAX}ms
        </p>
      </div>
      
      {/* Advanced Protections */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: themeColors.text }}>
          Advanced Protections
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ToggleSetting
            label="ML Evasion Patterns"
            description="Introduces human-like mistakes and hesitations"
            enabled={mlEvasionEnabled}
            onChange={setMlEvasionEnabled}
            colors={themeColors}
          />
          <ToggleSetting
            label="Digraph Pattern Noise"
            description="Adds targeted noise for common key pairs"
            enabled={digraphNoiseEnabled}
            onChange={setDigraphNoiseEnabled}
            colors={themeColors}
          />
          <ToggleSetting
            label="Session Randomization"
            description="Varies behavior patterns per browser session"
            enabled={sessionRandomizationEnabled}
            onChange={setSessionRandomizationEnabled}
            colors={themeColors}
          />
          <ToggleSetting
            label="Web Worker Timing Protection"
            description="Prevents timing analysis via Web Workers"
            enabled={webWorkerProtectionEnabled}
            onChange={setWebWorkerProtectionEnabled}
            colors={themeColors}
          />
        </div>
      </div>
      
      {/* Evasion Techniques */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: themeColors.text }}>
          Evasion Techniques
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ToggleSetting
            label="Gaussian Distribution"
            description="Uses normal distribution for realistic random noise"
            enabled={gaussianDistributionEnabled}
            onChange={setGaussianDistributionEnabled}
            colors={themeColors}
          />
          <ToggleSetting
            label="Micro-Jitter"
            description="Adds microsecond-level timing jitter"
            enabled={microJitterEnabled}
            onChange={setMicroJitterEnabled}
            colors={themeColors}
          />
          <ToggleSetting
            label="Performance.now() Coarsening"
            description="Reduces timing precision to prevent fingerprinting"
            enabled={performanceCoarseningEnabled}
            onChange={setPerformanceCoarseningEnabled}
            colors={themeColors}
          />
        </div>
      </div>
      
      {/* Save Button */}
      <button
        onClick={saveSettings}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: themeColors.primary,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Save Advanced Settings
      </button>
      
      <p style={{ 
        margin: '12px 0 0 0', 
        fontSize: '11px', 
        color: themeColors.textSecondary,
        textAlign: 'center'
      }}>
        Changes require extension reload
      </p>
    </div>
  );
};

interface ToggleSettingProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  colors: ThemeColors;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ 
  label, 
  description, 
  enabled, 
  onChange,
  colors
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: colors.surface,
      borderRadius: '4px',
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: colors.text }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: colors.textSecondary }}>
          {description}
        </div>
      </div>
      <label style={{
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px'
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ display: 'none' }}
        />
        <span style={{
          position: 'absolute',
          cursor: 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: enabled ? colors.primary : colors.border,
          borderRadius: '24px',
          transition: 'background-color 0.3s'
        }}>
          <span style={{
            position: 'absolute',
            content: '""',
            height: '18px',
            width: '18px',
            left: '3px',
            bottom: '3px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'transform 0.3s',
            transform: enabled ? 'translateX(20px)' : 'translateX(0)'
          }} />
        </span>
      </label>
    </div>
  );
};

