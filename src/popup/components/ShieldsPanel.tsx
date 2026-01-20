import React from 'react';
import { PrivacyLevel, DetectionResult } from '../../shared/types';
import { ThemeColors } from '../theme';

/**
 * Shields Panel Component
 * 
 * UX IMPROVEMENT: Prominent protection status display inspired by Brave's Shields Panel
 * Shows current site protection status with visual indicators and quick controls
 * 
 * @param domain - Current site domain
 * @param enabled - Whether protection is enabled
 * @param privacyLevel - Current privacy level
 * @param detections - Array of detected trackers
 * @param onToggle - Callback when protection is toggled
 * @param onPrivacyChange - Callback when privacy level changes
 * @param colors - Theme colors for dark/light mode
 */
interface Props {
  domain: string;
  enabled: boolean;
  privacyLevel: PrivacyLevel;
  detections: DetectionResult[];
  onToggle: (enabled: boolean) => void;
  onPrivacyChange: (level: PrivacyLevel) => void;
  colors: ThemeColors;
}

export const ShieldsPanel: React.FC<Props> = ({
  domain,
  enabled,
  privacyLevel,
  detections,
  onToggle,
  onPrivacyChange,
  colors
}) => {
  /**
   * Get shield icon based on protection status
   * 
   * @returns Emoji icon representing current status (for disabled/warning) or null (to render logo separately)
   */
  const getShieldIcon = (): string | null => {
    if (!enabled) return '❌';
    if (detections.length > 0) return '⚠️';
    return null; // Return null when we should use the logo image
  };
  
  /**
   * Get shield color based on protection status
   * 
   * @returns Hex color code for border and accents
   */
  const getShieldColor = (): string => {
    if (!enabled) return '#f44336'; // Red
    if (detections.length > 0) return '#ff9800'; // Orange
    if (privacyLevel === 'high') return '#4caf50'; // Green
    if (privacyLevel === 'medium') return '#2196f3'; // Blue
    return '#9e9e9e'; // Gray
  };
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: colors.surface,
      borderRadius: '8px',
      marginBottom: '16px',
      border: `2px solid ${getShieldColor()}`
    }}>
      {/* Shield Icon and Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '32px',
            filter: enabled ? 'none' : 'grayscale(100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px'
          }}>
            {getShieldIcon() ? (
              getShieldIcon()
            ) : (
              <img 
                src={chrome.runtime.getURL('assets/kala-icon-inv-128.webp')} 
                alt="Kala Shield" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  objectFit: 'contain',
                  filter: enabled ? 'none' : 'grayscale(100%)'
                }} 
              />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: colors.text }}>
              {enabled ? 'Protection Active' : 'Protection Disabled'}
            </div>
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
              {domain}
            </div>
          </div>
        </div>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
          />
        </label>
      </div>
      
      {/* Privacy Level Selector */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
          Privacy Level: <strong style={{ color: colors.text }}>{privacyLevel.toUpperCase()}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['low', 'medium', 'high'] as PrivacyLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => onPrivacyChange(level)}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '12px',
                borderRadius: '4px',
                border: `1px solid ${privacyLevel === level ? getShieldColor() : colors.border}`,
                backgroundColor: privacyLevel === level ? getShieldColor() : colors.surface,
                color: privacyLevel === level ? 'white' : colors.text,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Trackers Detected Alert */}
      {detections.length > 0 && (
        <div style={{
          padding: '8px',
          backgroundColor: colors.warning + '20',
          borderRadius: '4px',
          fontSize: '12px',
          color: colors.text,
          border: `1px solid ${colors.warning}`
        }}>
          ⚠️ <strong>{detections.length}</strong> tracker{detections.length > 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
};

