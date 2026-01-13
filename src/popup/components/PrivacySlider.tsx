import React from 'react';
import { PrivacyLevel } from '../../shared/types';

interface Props {
  level: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
}

export const PrivacySlider: React.FC<Props> = ({ level, onChange }) => {
  const levels: { value: PrivacyLevel; label: string; description: string }[] = [
    {
      value: 'low',
      label: 'Low',
      description: '30-50ms delay. Best for gaming and real-time typing.'
    },
    {
      value: 'medium',
      label: 'Medium',
      description: '50-100ms delay. Recommended for most websites.'
    },
    {
      value: 'high',
      label: 'High',
      description: '80-150ms delay. Maximum obfuscation.'
    }
  ];
  
  const currentLevel = levels.find(l => l.value === level) || levels[1];
  
  return (
    <div>
      <label style={{
        display: 'block',
        fontWeight: 'bold',
        marginBottom: '8px',
        fontSize: '14px'
      }}>
        Privacy Level
      </label>
      
      <select
        value={level}
        onChange={(e) => onChange(e.target.value as PrivacyLevel)}
        style={{
          width: '100%',
          padding: '8px',
          fontSize: '14px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          cursor: 'pointer'
        }}
      >
        {levels.map(l => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      
      <p style={{
        fontSize: '12px',
        color: '#666',
        marginTop: '8px',
        marginBottom: 0
      }}>
        {currentLevel.description}
      </p>
    </div>
  );
};

