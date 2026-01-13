import React from 'react';
import { ThemeColors } from '../theme';

/**
 * Stealth Mode Toggle Component
 * 
 * UX IMPROVEMENT: One-click maximum protection mode
 * Inspired by AdGuard's "Stealth Mode"
 * 
 * When enabled:
 * - Sets privacy level to HIGH
 * - Enables all advanced protections
 * - Maximum obfuscation
 * 
 * @param enabled - Whether stealth mode is enabled
 * @param onChange - Callback when stealth mode is toggled
 * @param colors - Theme colors for dark/light mode
 */
interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  colors: ThemeColors;
}

export const StealthModeToggle: React.FC<Props> = ({ enabled, onChange, colors }) => {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: enabled ? colors.surface : colors.background,
      borderRadius: '8px',
      border: `2px solid ${enabled ? colors.success : colors.border}`,
      marginBottom: '16px',
      transition: 'all 0.3s'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: colors.text,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🥷</span>
            <span>Stealth Mode</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary
          }}>
            {enabled
              ? 'Maximum protection: High privacy, all advanced protections enabled'
              : 'Enable for maximum behavioral protection'
            }
          </div>
        </div>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              width: '24px',
              height: '24px',
              cursor: 'pointer'
            }}
          />
        </label>
      </div>
    </div>
  );
};

