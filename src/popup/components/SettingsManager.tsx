import React, { useState } from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { Logger } from '../../shared/logger';
import { ThemeColors, getThemeColors } from '../theme';

/**
 * Settings Manager Component
 * 
 * Handles export and import of extension settings
 * 
 * @param colors - Theme colors for dark/light mode
 */
export const SettingsManager: React.FC<{ colors?: ThemeColors }> = ({ colors }) => {
  const themeColors = colors || getThemeColors('dark');
  const [exporting, setExporting] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  /**
   * Export settings
   */
  const handleExport = async (includeStatistics: boolean = false) => {
    setExporting(true);
    setMessage('');
    
    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.EXPORT_SETTINGS,
        payload: { includeStatistics }
      });
      
      if (response.success) {
        // Download file
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kala-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage('Settings exported successfully!');
        setMessageType('success');
      } else {
        setMessage(`Export failed: ${response.error}`);
        setMessageType('error');
      }
    } catch (error) {
      Logger.error('Export failed:', error);
      setMessage('Failed to export settings');
      setMessageType('error');
    } finally {
      setExporting(false);
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    }
  };
  
  /**
   * Import settings
   */
  const handleImport = async (merge: boolean = true) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setImporting(true);
      setMessage('');
      
      try {
        const text = await file.text();
        const response = await Messaging.sendToBackground({
          type: MessageType.IMPORT_SETTINGS,
          payload: { data: text, mode: merge ? 'merge' : 'replace' }
        });
        
        if (response.success) {
          setMessage(
            `Settings imported successfully! ` +
            `${response.globalSettingsImported ? 'Global settings' : ''} ` +
            `${response.sitesImported} site${response.sitesImported !== 1 ? 's' : ''} imported.`
          );
          setMessageType('success');
          
          // Reload page to apply settings
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          const errorMsg = response.errors?.join(', ') || 'Unknown error';
          setMessage(`Import failed: ${errorMsg}`);
          setMessageType('error');
        }
      } catch (error) {
        Logger.error('Import failed:', error);
        setMessage('Failed to import settings');
        setMessageType('error');
      } finally {
        setImporting(false);
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 5000);
      }
    };
    
    input.click();
  };
  
  return (
    <div style={{ padding: '16px', color: themeColors.text }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: themeColors.text }}>
        ⚙️ Settings Management
      </h3>
      
      {/* Export Section */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: themeColors.textSecondary }}>
          Export Settings
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleExport(false)}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: themeColors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1
            }}
          >
            {exporting ? 'Exporting...' : '📥 Export Settings'}
          </button>
          <button
            onClick={() => handleExport(true)}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: themeColors.success,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1
            }}
          >
            {exporting ? 'Exporting...' : '📊 Export + Statistics'}
          </button>
        </div>
      </div>
      
      {/* Import Section */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: themeColors.textSecondary }}>
          Import Settings
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleImport(true)}
            disabled={importing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: themeColors.warning,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: importing ? 'not-allowed' : 'pointer',
              opacity: importing ? 0.6 : 1
            }}
          >
            {importing ? 'Importing...' : '📤 Import (Merge)'}
          </button>
          <button
            onClick={() => handleImport(false)}
            disabled={importing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: themeColors.error,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: importing ? 'not-allowed' : 'pointer',
              opacity: importing ? 0.6 : 1
            }}
          >
            {importing ? 'Importing...' : '🔄 Import (Replace)'}
          </button>
        </div>
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: themeColors.textSecondary,
          fontStyle: 'italic'
        }}>
          Merge: Combines with existing settings. Replace: Overwrites all settings.
        </p>
      </div>
      
      {/* Message Display */}
      {message && (
        <div style={{
          padding: '12px',
          backgroundColor: messageType === 'success' ? themeColors.success + '20' : themeColors.error + '20',
          color: messageType === 'success' ? themeColors.success : themeColors.error,
          borderRadius: '4px',
          fontSize: '14px',
          marginTop: '16px',
          border: `1px solid ${messageType === 'success' ? themeColors.success : themeColors.error}`
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

