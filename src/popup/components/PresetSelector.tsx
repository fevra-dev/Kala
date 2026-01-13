import React, { useEffect } from 'react';
import { PRESETS } from '../../shared/constants';
import type { Preset, PresetConfig } from '../../shared/types';
import { ThemeColors } from '../theme';

/**
 * Preset Selector Component
 * 
 * UX IMPROVEMENT: Quick preset configurations for easy setup
 * Inspired by AdGuard's preset configurations
 * 
 * Presets:
 * - Gaming: Low obfuscation, high responsiveness
 * - Balanced: Medium obfuscation, good balance
 * - Privacy: High obfuscation, maximum protection
 * 
 * ENHANCEMENT: Automatically updates when privacy level changes (v0.2.0)
 * 
 * @param currentPreset - Currently selected preset
 * @param privacyLevel - Current privacy level (used to sync preset selection)
 * @param onChange - Callback when preset changes
 */
interface Props {
  currentPreset: Preset;
  privacyLevel: string;
  onChange: (preset: Preset) => void;
  colors: ThemeColors;
}

export const PresetSelector: React.FC<Props> = ({ currentPreset, privacyLevel, onChange, colors }) => {
  // Sync preset selection when privacy level changes (but not when preset changes)
  useEffect(() => {
    // Find preset that matches current privacy level
    for (const [presetKey, presetConfig] of Object.entries(PRESETS) as [string, PresetConfig][]) {
      if (presetKey === 'custom') continue;
      if (presetConfig.privacyLevel === privacyLevel && currentPreset !== presetKey) {
        // Only update if preset doesn't match - avoid infinite loops
        // Use setTimeout to avoid state update during render
        setTimeout(() => onChange(presetKey as Preset), 0);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyLevel]); // Only react to privacy level changes, not currentPreset
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        fontSize: '12px', 
        color: colors.textSecondary, 
        marginBottom: '8px',
        fontWeight: 'bold'
      }}>
        Quick Presets:
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['gaming', 'balanced', 'privacy'] as Preset[]).map((preset) => {
          const config = PRESETS[preset];
          const isSelected = currentPreset === preset;
          
          return (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `2px solid ${isSelected ? colors.success : colors.border}`,
                backgroundColor: isSelected ? colors.success + '20' : colors.surface,
                color: isSelected ? colors.success : colors.text,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                {config.name}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, color: colors.textSecondary }}>
                {config.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
