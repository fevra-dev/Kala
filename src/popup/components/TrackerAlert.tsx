import React from 'react';
import { DetectionResult } from '../../shared/types';
import { ThemeColors } from '../theme';

interface Props {
  detections: DetectionResult[];
  colors: ThemeColors;
}

export const TrackerAlert: React.FC<Props> = ({ detections, colors }) => {
  const highSeverityDetections = detections.filter(d => d.severity === 'high');
  
  if (detections.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: highSeverityDetections.length > 0 
        ? colors.warning + '20' 
        : colors.primary + '20',
      borderRadius: '8px',
      border: `2px solid ${highSeverityDetections.length > 0 ? colors.warning : colors.primary}`,
      color: colors.text
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
        ⚠️ Trackers Detected
      </div>
      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: colors.text }}>
        {detections.slice(0, 3).map((d, i) => (
          <li key={i} style={{ marginBottom: '4px' }}>
            <strong>{d.name}</strong> - {d.description}
          </li>
        ))}
      </ul>
      {detections.length > 3 && (
        <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
          +{detections.length - 3} more detections
        </p>
      )}
      <p style={{ fontSize: '12px', marginTop: '8px', marginBottom: 0, color: colors.text }}>
        Kala is protecting you.
      </p>
    </div>
  );
};

