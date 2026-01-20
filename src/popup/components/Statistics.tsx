import React, { useEffect, useState } from 'react';
import { Messaging, MessageType } from '../../shared/messaging';
import { Statistics } from '../../shared/types';
import { Logger } from '../../shared/logger';
import { ThemeColors } from '../theme';

/**
 * Statistics Dashboard Component
 * 
 * Displays extension statistics:
 * - Trackers blocked
 * - Protection hours
 * - Sites protected
 * - Events obfuscated
 * - Privacy level usage
 * 
 * @param colors - Theme colors for dark/light mode
 */
export const StatisticsDashboard: React.FC<{ colors?: ThemeColors }> = ({ colors }) => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Use provided colors or default to dark theme
  const themeColors: ThemeColors = colors || {
    background: '#000000',
    surface: '#0a0a0a',
    surfaceAlt: '#141414',
    text: '#ffffff',
    textSecondary: '#999999',
    textTertiary: '#666666',
    border: '#222222',
    primary: '#ffffff',
    primaryHover: '#e0e0e0',
    success: '#ffffff',
    warning: '#888888',
    error: '#666666',
    shieldActive: '#ffffff',
    shieldInactive: '#333333'
  };
  
  useEffect(() => {
    loadStatistics();
  }, []);
  
  /**
   * Load statistics from service worker
   */
  const loadStatistics = async () => {
    try {
      const response = await Messaging.sendToBackground({
        type: MessageType.GET_STATISTICS
      });
      
      setStatistics(response.statistics);
    } catch (error) {
      Logger.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Reset statistics
   */
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all statistics?')) {
      return;
    }
    
    try {
      await Messaging.sendToBackground({
        type: MessageType.RESET_STATISTICS
      });
      
      await loadStatistics();
    } catch (error) {
      Logger.error('Failed to reset statistics:', error);
    }
  };
  
  /**
   * Format hours to readable string
   */
  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours.toFixed(1)} hours`;
    }
  };
  
  /**
   * Format number with commas
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: themeColors.text }}>
        Loading statistics...
      </div>
    );
  }
  
  if (!statistics) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: themeColors.textSecondary }}>
        No statistics available
      </div>
    );
  }
  
  return (
    <div style={{ padding: '16px', color: themeColors.text }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: themeColors.text }}>
          📊 Statistics
        </h2>
        <button
          onClick={handleReset}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: themeColors.error,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>
      
      {/* Protection Overview */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: themeColors.textSecondary }}>
          Protection Overview
        </h3>
        {/* DIETER RAMS: Compact grid layout - essential stats only */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          <StatCard
            label="Trackers Blocked"
            value={formatNumber(statistics.trackersBlocked)}
            icon={
              <img 
                src={chrome.runtime.getURL('assets/kala-icon-inv-128.webp')} 
                alt="Kala" 
                style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
              />
            }
            colors={themeColors}
          />
          <StatCard
            label="Sites Protected"
            value={formatNumber(statistics.sitesProtected)}
            icon="🌐"
            colors={themeColors}
          />
          <StatCard
            label="Protection Time"
            value={formatHours(statistics.protectionHours)}
            icon="⏱️"
            colors={themeColors}
          />
          <StatCard
            label="Events Obfuscated"
            value={formatNumber(statistics.eventsObfuscated)}
            icon="🔒"
            colors={themeColors}
          />
        </div>
      </div>
      
      {/* Privacy Level Usage */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: themeColors.textSecondary }}>
          Privacy Level Usage
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <PrivacyLevelBar
            level="Low"
            hours={statistics.privacyLevelUsage.low}
            total={statistics.protectionHours}
            color={themeColors.success}
            colors={themeColors}
          />
          <PrivacyLevelBar
            level="Medium"
            hours={statistics.privacyLevelUsage.medium}
            total={statistics.protectionHours}
            color={themeColors.primary}
            colors={themeColors}
          />
          <PrivacyLevelBar
            level="High"
            hours={statistics.privacyLevelUsage.high}
            total={statistics.protectionHours}
            color={themeColors.warning}
            colors={themeColors}
          />
        </div>
      </div>
      
      {/* Performance Metrics */}
      {statistics.eventsObfuscated > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: themeColors.textSecondary }}>
            Performance
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px' 
          }}>
            <StatCard
              label="Avg. Overhead"
              value={`${statistics.averageEventOverhead.toFixed(2)}ms`}
              icon="⚡"
              colors={themeColors}
            />
            <StatCard
              label="Max Overhead"
              value={`${statistics.maxEventOverhead.toFixed(2)}ms`}
              icon="📈"
              colors={themeColors}
            />
          </div>
        </div>
      )}
      
      {/* First Use */}
      <div style={{ 
        padding: '12px', 
        backgroundColor: themeColors.surface, 
        borderRadius: '4px',
        fontSize: '12px',
        color: themeColors.textSecondary,
        border: `1px solid ${themeColors.border}`
      }}>
        First use: {new Date(statistics.firstUse).toLocaleDateString()}
      </div>
    </div>
  );
};

/**
 * Stat Card Component
 * DIETER RAMS: Compact, essential information only
 */
interface StatCardProps {
  label: string;
  value: string;
  icon: string | JSX.Element;
  colors: ThemeColors;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colors }) => {
  return (
    <div style={{
      padding: '10px',
      backgroundColor: colors.surface,
      borderRadius: '4px',
      border: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: 0,
      flex: 1
    }}>
      <div style={{ 
        fontSize: typeof icon === 'string' ? '18px' : 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: typeof icon === 'string' ? 'auto' : '20px',
        height: typeof icon === 'string' ? 'auto' : '20px'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.text, marginBottom: '2px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: colors.textSecondary }}>
          {label}
        </div>
      </div>
    </div>
  );
};

/**
 * Privacy Level Bar Component
 */
interface PrivacyLevelBarProps {
  level: string;
  hours: number;
  total: number;
  color: string;
  colors: ThemeColors;
}

const PrivacyLevelBar: React.FC<PrivacyLevelBarProps> = ({ 
  level, 
  hours, 
  total, 
  color,
  colors
}) => {
  const percentage = total > 0 ? (hours / total) * 100 : 0;
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '4px',
        fontSize: '12px'
      }}>
        <span style={{ fontWeight: 'bold', color: colors.text }}>{level}</span>
        <span style={{ color: colors.textSecondary }}>
          {formatHours(hours)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: colors.surface,
        borderRadius: '3px',
        overflow: 'hidden',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
  
  function formatHours(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
  }
};

