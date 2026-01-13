import React from 'react';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const ProtectionToggle: React.FC<Props> = ({ enabled, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      backgroundColor: enabled ? '#e8f5e9' : '#ffebee',
      borderRadius: '8px',
      border: `2px solid ${enabled ? '#4caf50' : '#f44336'}`
    }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          {enabled ? '✓ Protection Active' : '✗ Protection Disabled'}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {enabled 
            ? 'Obfuscating your behavioral patterns'
            : 'Click to enable protection on this site'
          }
        </div>
      </div>
      <label style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            width: '20px',
            height: '20px',
            cursor: 'pointer'
          }}
        />
      </label>
    </div>
  );
};

