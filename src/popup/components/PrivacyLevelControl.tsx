import React from 'react';
import { PrivacyLevel } from '../../shared/types';
import { ThemeColors } from '../theme';
import { CONSTANTS } from '../../shared/constants';

/**
 * Privacy Level Control Component
 * 
 * DIETER RAMS PRINCIPLE: "Good Design is as Little Design as Possible"
 * Simplified, minimal control replacing redundant Stealth Mode and Quick Presets
 * 
 * Shows three clear options with delay ranges and descriptions
 */
interface Props {
  privacyLevel: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
  colors: ThemeColors;
}

export const PrivacyLevelControl: React.FC<Props> = ({ privacyLevel, onChange, colors }) => {
  /**
   * Get delay range for privacy level
   */
  const getDelayRange = (level: PrivacyLevel): string => {
    switch (level) {
      case 'low':
        return `${CONSTANTS.DELAY.LOW_PRIVACY.BASE}-${CONSTANTS.DELAY.LOW_PRIVACY.BASE + CONSTANTS.DELAY.LOW_PRIVACY.VARIANCE}ms`;
      case 'medium':
        return `${CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE}-${CONSTANTS.DELAY.MEDIUM_PRIVACY.BASE + CONSTANTS.DELAY.MEDIUM_PRIVACY.VARIANCE}ms`;
      case 'high':
        return `${CONSTANTS.DELAY.HIGH_PRIVACY.BASE}-${CONSTANTS.DELAY.HIGH_PRIVACY.BASE + CONSTANTS.DELAY.HIGH_PRIVACY.VARIANCE}ms`;
      default:
        return '0-0ms';
    }
  };
  
  const levels: Array<{
    value: PrivacyLevel;
    label: string;
    subtitle: string;
    description: string;
  }> = [
    {
      value: 'low',
      label: 'Gaming Mode',
      subtitle: 'Low obfuscation, high responsiveness',
      description: getDelayRange('low')
    },
    {
      value: 'medium',
      label: 'Balanced',
      subtitle: 'Medium obfuscation, good balance',
      description: getDelayRange('medium')
    },
    {
      value: 'high',
      label: 'Privacy Mode',
      subtitle: 'High obfuscation, maximum protection',
      description: getDelayRange('high')
    }
  ];
  
  return (
    <div style={{ marginBottom: '20px' }}>
      {levels.map((level) => {
        const isSelected = privacyLevel === level.value;
        
        return (
          <div
            key={level.value}
            onClick={() => onChange(level.value)}
            style={{
              padding: '14px',
              marginBottom: '10px',
              backgroundColor: isSelected ? colors.surface : colors.background,
              border: `2px solid ${isSelected ? colors.primary : colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px'
              }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '15px',
                  color: colors.text
                }}>
                  {level.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.textSecondary,
                  padding: '2px 8px',
                  backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                  borderRadius: '4px'
                }}>
                  {level.description}
                </div>
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.textSecondary
              }}>
                {level.subtitle}
              </div>
            </div>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: `2px solid ${isSelected ? colors.primary : colors.border}`,
              backgroundColor: isSelected ? colors.primary : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isSelected && (
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'white'
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

