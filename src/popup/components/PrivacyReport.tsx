import React, { useState, useEffect } from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { Statistics, DetectionResult } from '../../shared/types';
import { Logger } from '../../shared/logger';
import { ThemeColors, getThemeColors } from '../theme';

/**
 * Privacy Report Generator
 * 
 * Generates comprehensive privacy reports:
 * - Protection statistics
 * - Tracker detections
 * - Privacy recommendations
 * - Exportable format (HTML/JSON)
 * 
 * @param colors - Theme colors for dark/light mode
 */
export const PrivacyReport: React.FC<{ colors?: ThemeColors }> = ({ colors }) => {
  const themeColors = colors || getThemeColors('dark');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportFormat, setReportFormat] = useState<'html' | 'json'>('html');
  
  useEffect(() => {
    loadReportData();
  }, []);
  
  const loadReportData = async () => {
    try {
      // Load statistics
      const statsResponse = await Messaging.sendToBackground({
        type: MessageType.GET_STATISTICS
      });
      setStatistics(statsResponse.statistics);
      
      // Load detections
      const detectionsResponse = await Messaging.sendToBackground({
        type: MessageType.GET_DETECTIONS
      });
      setDetections(detectionsResponse.detections || []);
    } catch (error) {
      Logger.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Generate HTML report
   */
  const generateHTMLReport = (): string => {
    if (!statistics) return '';
    
    const reportDate = new Date().toLocaleDateString();
    const highSeverityDetections = detections.filter(d => d.severity === 'high').length;
    const mediumSeverityDetections = detections.filter(d => d.severity === 'medium').length;
    const lowSeverityDetections = detections.filter(d => d.severity === 'low').length;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kala Privacy Report - ${reportDate}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      margin: 0 0 15px 0;
      color: #2196F3;
      font-size: 24px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #2196F3;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
    }
    .detection-item {
      padding: 12px;
      margin-bottom: 10px;
      border-left: 4px solid;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .detection-item.high {
      border-color: #f44336;
    }
    .detection-item.medium {
      border-color: #FF9800;
    }
    .detection-item.low {
      border-color: #4CAF50;
    }
    .recommendation {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 10px;
      border-left: 4px solid #2196F3;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img 
        src={chrome.runtime.getURL('assets/logo.png')} 
        alt="Kala" 
        style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
      />
      Kala Privacy Report
    </h1>
    <p>Generated on ${reportDate}</p>
  </div>
  
  <div class="section">
    <h2>📊 Protection Overview</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${statistics.trackersBlocked}</div>
        <div class="stat-label">Trackers Blocked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.sitesProtected}</div>
        <div class="stat-label">Sites Protected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.eventsObfuscated.toLocaleString()}</div>
        <div class="stat-label">Events Obfuscated</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.protectionHours.toFixed(1)}h</div>
        <div class="stat-label">Protection Time</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>🔍 Tracker Detections</h2>
    <p><strong>Total Detections:</strong> ${detections.length}</p>
    <p>
      <strong>High Severity:</strong> ${highSeverityDetections} | 
      <strong>Medium:</strong> ${mediumSeverityDetections} | 
      <strong>Low:</strong> ${lowSeverityDetections}
    </p>
    ${detections.slice(0, 10).map(detection => `
      <div class="detection-item ${detection.severity}">
        <strong>${detection.name}</strong> (${detection.severity})
        <br>
        <small>${detection.description}</small>
        <br>
        <small>Detected: ${new Date(detection.timestamp).toLocaleString()}</small>
      </div>
    `).join('')}
    ${detections.length > 10 ? `<p><em>... and ${detections.length - 10} more detections</em></p>` : ''}
  </div>
  
  <div class="section">
    <h2>💡 Privacy Recommendations</h2>
    ${generateRecommendations(statistics, detections)}
  </div>
  
  <div class="section">
    <h2>⚡ Performance Metrics</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${statistics.averageEventOverhead.toFixed(2)}ms</div>
        <div class="stat-label">Avg. Processing Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.maxEventOverhead.toFixed(2)}ms</div>
        <div class="stat-label">Max Processing Time</div>
      </div>
    </div>
    <p style="margin-top: 15px; color: #666;">
      Kala maintains excellent performance with minimal overhead, ensuring your browsing experience remains smooth while protecting your privacy.
    </p>
  </div>
  
  <div class="footer">
    <p>Generated by Kala Browser Extension</p>
    <p>All data processed locally. No information leaves your device.</p>
  </div>
</body>
</html>`;
  };
  
  /**
   * Generate JSON report
   */
  const generateJSONReport = (): string => {
    if (!statistics) return '{}';
    
    return JSON.stringify({
      reportDate: new Date().toISOString(),
      version: '1.0',
      statistics: {
        trackersBlocked: statistics.trackersBlocked,
        sitesProtected: statistics.sitesProtected,
        eventsObfuscated: statistics.eventsObfuscated,
        protectionHours: statistics.protectionHours,
        privacyLevelUsage: statistics.privacyLevelUsage,
        performance: {
          averageEventOverhead: statistics.averageEventOverhead,
          maxEventOverhead: statistics.maxEventOverhead
        }
      },
      detections: detections.map(d => ({
        name: d.name,
        severity: d.severity,
        type: d.type,
        timestamp: d.timestamp,
        description: d.description
      })),
      recommendations: generateRecommendationsText(statistics, detections)
    }, null, 2);
  };
  
  /**
   * Generate privacy recommendations
   */
  const generateRecommendations = (stats: Statistics, dets: DetectionResult[]): string => {
    const recommendations: string[] = [];
    
    if (stats.trackersBlocked > 0) {
      recommendations.push(`
        <div class="recommendation">
          <strong>✅ Active Protection:</strong> Kala has successfully blocked ${stats.trackersBlocked} 
          behavioral tracking attempts. Your privacy is being protected.
        </div>
      `);
    }
    
    if (dets.filter(d => d.severity === 'high').length > 0) {
      recommendations.push(`
        <div class="recommendation">
          <strong>⚠️ High-Risk Trackers Detected:</strong> Consider using "High" privacy level 
          for maximum protection against aggressive trackers.
        </div>
      `);
    }
    
    if (stats.protectionHours < 1) {
      recommendations.push(`
        <div class="recommendation">
          <strong>💡 New User:</strong> Keep Kala enabled to build up protection statistics 
          and maximize your privacy protection.
        </div>
      `);
    }
    
    if (stats.privacyLevelUsage.high < stats.privacyLevelUsage.medium) {
      recommendations.push(`
        <div class="recommendation">
          <strong>🔒 Privacy Level:</strong> Consider using "High" privacy level for 
          sensitive browsing to maximize obfuscation.
        </div>
      `);
    }
    
    return recommendations.join('') || `
      <div class="recommendation">
        <strong>✅ All Good:</strong> Your privacy protection is working well. 
        Keep Kala enabled for continued protection.
      </div>
    `;
  };
  
  /**
   * Generate recommendations as text
   */
  const generateRecommendationsText = (stats: Statistics, dets: DetectionResult[]): string[] => {
    const recommendations: string[] = [];
    
    if (stats.trackersBlocked > 0) {
      recommendations.push(`Kala has blocked ${stats.trackersBlocked} tracking attempts.`);
    }
    
    if (dets.filter(d => d.severity === 'high').length > 0) {
      recommendations.push('Consider using High privacy level for maximum protection.');
    }
    
    return recommendations;
  };
  
  /**
   * Download report
   */
  const downloadReport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (reportFormat === 'html') {
      content = generateHTMLReport();
      filename = `kala-privacy-report-${new Date().toISOString().split('T')[0]}.html`;
      mimeType = 'text/html';
    } else {
      content = generateJSONReport();
      filename = `kala-privacy-report-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading report data...
      </div>
    );
  }
  
  if (!statistics) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No data available for report
      </div>
    );
  }
  
  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
        📄 Privacy Report
      </h3>
      
      <p style={{ 
        margin: '0 0 20px 0', 
        fontSize: '13px', 
        color: '#666'
      }}>
        Generate a comprehensive privacy report with your protection statistics, 
        tracker detections, and personalized recommendations.
      </p>
      
      {/* Format Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: 'bold',
          marginBottom: '8px',
          color: themeColors.text
        }}>
          Report Format
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{
            flex: 1,
            padding: '10px',
            border: `2px solid ${reportFormat === 'html' ? themeColors.primary : themeColors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            backgroundColor: reportFormat === 'html' ? themeColors.primary + '20' : themeColors.surface,
            color: themeColors.text
          }}>
            <input
              type="radio"
              value="html"
              checked={reportFormat === 'html'}
              onChange={(e) => setReportFormat(e.target.value as 'html' | 'json')}
              style={{ marginRight: '8px' }}
            />
            HTML
          </label>
          <label style={{
            flex: 1,
            padding: '10px',
            border: `2px solid ${reportFormat === 'json' ? themeColors.primary : themeColors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            backgroundColor: reportFormat === 'json' ? themeColors.primary + '20' : themeColors.surface,
            color: themeColors.text
          }}>
            <input
              type="radio"
              value="json"
              checked={reportFormat === 'json'}
              onChange={(e) => setReportFormat(e.target.value as 'html' | 'json')}
              style={{ marginRight: '8px' }}
            />
            JSON
          </label>
        </div>
      </div>
      
      {/* Preview Stats */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Report will include:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#666' }}>
          <li>{statistics.trackersBlocked} tracker detections</li>
          <li>{statistics.sitesProtected} protected sites</li>
          <li>{statistics.eventsObfuscated.toLocaleString()} obfuscated events</li>
          <li>Performance metrics</li>
          <li>Privacy recommendations</li>
        </ul>
      </div>
      
      {/* Generate Button */}
      <button
        onClick={downloadReport}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        📥 Generate & Download Report
      </button>
      
      <p style={{ 
        margin: '12px 0 0 0', 
        fontSize: '11px', 
        color: '#999',
        textAlign: 'center'
      }}>
        Report contains anonymized data. Safe to share.
      </p>
    </div>
  );
};

