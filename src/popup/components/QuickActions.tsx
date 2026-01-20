import React from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { Logger } from '../../shared/logger';
import { ThemeColors } from '../theme';

/**
 * Quick Actions Component
 * 
 * UX IMPROVEMENT: Quick action buttons for common tasks
 * Inspired by AdGuard and Brave's quick action menus
 * 
 * @param domain - Current site domain
 * @param enabled - Whether protection is enabled
 * @param onProtectionToggle - Callback to toggle protection
 * @param colors - Theme colors for dark/light mode
 */
interface Props {
  domain: string;
  enabled: boolean;
  onProtectionToggle: () => void;
  colors: ThemeColors;
}

export const QuickActions: React.FC<Props> = ({
  domain: _domain,
  enabled,
  onProtectionToggle,
  colors
}) => {
  /**
   * Handle "Protect Site" action
   * Enables protection if currently disabled
   */
  const handleProtectSite = async () => {
    if (!enabled) {
      onProtectionToggle();
    }
  };
  
  /**
   * Handle "Whitelist Site" action
   * Disables protection if currently enabled
   */
  const handleWhitelistSite = async () => {
    if (enabled) {
      onProtectionToggle();
    }
  };
  
  /**
   * Handle "Report Tracker" action
   * Opens GitHub issues page for tracker reporting
   * 
   * SECURITY: Uses chrome.tabs.create() for better security than window.open()
   */
  const handleReportTracker = async () => {
    try {
      // SECURITY: Use chrome.tabs.create() instead of window.open() for better security
      // This prevents potential issues with opener access
      const githubUrl = 'https://github.com/yourusername/kala/issues/new?template=tracker-report.md';
      
      // Validate URL format before opening
      try {
        new URL(githubUrl); // Validate URL format
      } catch (error) {
        Logger.error('Invalid GitHub URL format:', error);
        return;
      }
      
      // Use chrome.tabs API if available (more secure than window.open)
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: githubUrl });
      } else {
        // Fallback to window.open with security attributes
        window.open(githubUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      Logger.error('Failed to open tracker report page:', error);
    }
  };
  
  /**
   * Handle "Export Settings" action
   * Exports current settings to JSON file
   */
  const handleExportSettings = async () => {
    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.EXPORT_SETTINGS,
        payload: { includeStats: false }
      });
      
      if (response.success && response.data) {
        // Create download
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kala-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      Logger.error('Failed to export settings:', error);
    }
  };
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      marginTop: '16px',
      marginBottom: '16px'
    }}>
      <button
        onClick={handleProtectSite}
        disabled={enabled}
        style={{
          padding: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: enabled ? colors.border : colors.success,
          color: enabled ? colors.textSecondary : 'white',
          cursor: enabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img 
            src={chrome.runtime.getURL('assets/kala-icon-inv-128.webp')} 
            alt="Kala" 
            style={{ width: '16px', height: '16px', objectFit: 'contain' }} 
          />
          Protect Site
        </span>
      </button>
      
      <button
        onClick={handleWhitelistSite}
        disabled={!enabled}
        style={{
          padding: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: !enabled ? colors.border : colors.error,
          color: !enabled ? colors.textSecondary : 'white',
          cursor: !enabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
      >
        ⚪ Whitelist Site
      </button>
      
      <button
        onClick={handleReportTracker}
        style={{
          padding: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
          borderRadius: '6px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          color: colors.text,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        📢 Report Tracker
      </button>
      
      <button
        onClick={handleExportSettings}
        style={{
          padding: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
          borderRadius: '6px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          color: colors.text,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        💾 Export Settings
      </button>
    </div>
  );
};

