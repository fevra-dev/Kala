/**
 * Kala Popup - Main UI Component
 * 
 * Design Principles (Dieter Rams):
 * - "Less, but better"
 * - "Good design is as little design as possible"
 * - Every element serves a purpose
 * - Unobtrusive, honest, long-lasting
 */

import React, { useEffect, useState } from 'react';
import { Messaging, MessageType } from '../shared/messaging';
import { DetectionResult, PrivacyLevel, Statistics } from '../shared/types';
import { Logger } from '../shared/logger';
import { CONSTANTS } from '../shared/constants';
import { storage, tabs } from '../shared/browser-compat';
import { getThemeColors } from './theme';

// View states for fixed screen navigation
type View = 'main' | 'stats' | 'settings' | 'advanced' | 'report' | 'onboarding';

export const Popup: React.FC = () => {
  // Core state
  const [domain, setDomain] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('medium');
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<View>('main');
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  
  // Theme - dark by default
  const colors = getThemeColors('dark');
  
  // Check onboarding on mount
  useEffect(() => {
    checkOnboarding();
  }, []);
  
  // Load data when not onboarding
  useEffect(() => {
    if (!needsOnboarding && view !== 'onboarding') {
      loadData();
    }
  }, [needsOnboarding, view]);
  
  // Sync listener
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && (changes[CONSTANTS.STORAGE_KEYS.SITE_SETTINGS] || changes[CONSTANTS.STORAGE_KEYS.SETTINGS])) {
        loadData();
      }
    };
    
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);
  
  /**
   * Check if onboarding needed
   */
  const checkOnboarding = async () => {
    try {
      const result = await storage.local.get('kala_onboarding_completed');
      if (!result.kala_onboarding_completed) {
        setNeedsOnboarding(true);
        setView('onboarding');
      }
      setLoading(false);
    } catch (error) {
      Logger.error('Onboarding check failed:', error);
      setLoading(false);
    }
  };
  
  /**
   * Load current site data
   */
  const loadData = async () => {
    try {
      // Check for pop-out sync data first
      const syncData = await storage.local.get('kala_popout_sync');
      if (syncData.kala_popout_sync) {
        const sync = syncData.kala_popout_sync;
        if (Date.now() - (sync.timestamp || 0) < 5000) {
          setDomain(sync.domain);
          setPrivacyLevel(sync.privacyLevel);
          setEnabled(sync.enabled ?? true);
          await storage.local.remove('kala_popout_sync');
        }
      }
      
      const response = await Messaging.sendToBackground({
        type: MessageType.GET_CURRENT_SITE_SETTINGS
      });
      
      setDomain(response.domain);
      setEnabled(response.settings.enabled);
      setPrivacyLevel(response.settings.privacyLevel);
      setDetections(response.detections);
    } catch (error) {
      Logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Toggle protection
   */
  const toggleProtection = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    
    await Messaging.sendToBackground({
      type: MessageType.UPDATE_SITE_SETTINGS,
      payload: {
        domain,
        settings: { enabled: newEnabled, privacyLevel, whitelisted: false }
      }
    });
  };
  
  /**
   * Change privacy level
   */
  const changePrivacyLevel = async (level: PrivacyLevel) => {
    setPrivacyLevel(level);
    
    await Messaging.sendToBackground({
      type: MessageType.UPDATE_SITE_SETTINGS,
      payload: {
        domain,
        settings: { enabled, privacyLevel: level, whitelisted: false }
      }
    });
  };
  
  /**
   * Complete onboarding
   */
  const completeOnboarding = async (selectedLevel: PrivacyLevel) => {
    await storage.local.set({ kala_onboarding_completed: true });
    setPrivacyLevel(selectedLevel);
    setNeedsOnboarding(false);
    setView('main');
    
    // Apply selected level
    if (domain) {
      await Messaging.sendToBackground({
        type: MessageType.UPDATE_SITE_SETTINGS,
        payload: {
          domain,
          settings: { enabled: true, privacyLevel: selectedLevel, whitelisted: false }
        }
      });
    }
  };
  
  /**
   * Pop out to new tab
   */
  const popOut = async () => {
    await storage.local.set({
      'kala_popout_sync': { domain, privacyLevel, enabled, timestamp: Date.now() }
    });
    await new Promise(r => setTimeout(r, 100));
    const url = chrome.runtime.getURL('popup.html');
    await tabs.create({ url });
  };

  // Base styles
  const baseStyle: React.CSSProperties = {
    width: '320px',
    height: '400px',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ ...baseStyle, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: colors.textSecondary }}>
          Loading
        </div>
      </div>
    );
  }

  // Onboarding view - no footer
  if (view === 'onboarding') {
    return <OnboardingView colors={colors} onComplete={completeOnboarding} />;
  }

  // All other views - persistent layout with footer
  return (
    <div style={baseStyle}>
      {/* Header - Logo only, minimal */}
      <header style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <img 
          src={chrome.runtime.getURL('assets/logo.png')} 
          alt="Kala" 
          onClick={() => setView('main')}
          style={{ 
            width: '32px', 
            height: '32px',
            cursor: 'pointer'
          }} 
        />
        <button
          onClick={popOut}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textTertiary,
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px'
          }}
          title="Open in new tab"
        >
          ↗
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {view === 'main' && (
          <MainView 
            domain={domain}
            enabled={enabled}
            privacyLevel={privacyLevel}
            detections={detections}
            toggleProtection={toggleProtection}
            changePrivacyLevel={changePrivacyLevel}
            colors={colors}
          />
        )}
        {view === 'stats' && <StatsView colors={colors} />}
        {view === 'settings' && (
          <SettingsView 
            colors={colors} 
            onAdvanced={() => setView('advanced')}
            onReport={() => setView('report')}
          />
        )}
        {view === 'advanced' && <AdvancedView colors={colors} onBack={() => setView('settings')} />}
        {view === 'report' && <ReportView colors={colors} onBack={() => setView('settings')} />}
      </main>

      {/* Footer Navigation */}
      <footer style={{
        padding: '12px 20px',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        flexShrink: 0
      }}>
        <FooterButton 
          label="Main" 
          active={view === 'main'}
          onClick={() => setView('main')} 
          colors={colors}
        />
        <FooterButton 
          label="Stats" 
          active={view === 'stats'}
          onClick={() => setView('stats')} 
          colors={colors}
        />
        <FooterButton 
          label="Settings" 
          active={view === 'settings' || view === 'advanced' || view === 'report'}
          onClick={() => setView('settings')} 
          colors={colors}
        />
      </footer>
    </div>
  );
};

/**
 * Footer Button - with subtle dot indicator for active state
 */
const FooterButton: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
  colors: ReturnType<typeof getThemeColors>;
}> = ({ label, active = false, onClick, colors }) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      color: active ? colors.text : colors.textTertiary,
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: active ? '600' : '400',
      letterSpacing: '0.5px',
      padding: '8px 16px',
      transition: 'color 0.15s ease'
    }}
  >
    {label}
  </button>
);

/**
 * Main View
 */
const MainView: React.FC<{
  domain: string;
  enabled: boolean;
  privacyLevel: PrivacyLevel;
  detections: DetectionResult[];
  toggleProtection: () => void;
  changePrivacyLevel: (level: PrivacyLevel) => void;
  colors: ReturnType<typeof getThemeColors>;
}> = ({ domain, enabled, privacyLevel, detections, toggleProtection, changePrivacyLevel, colors }) => (
  <div style={{ 
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between'
  }}>
    {/* Domain & Status */}
    <div>
      <div style={{ 
        fontSize: '10px', 
        letterSpacing: '1px', 
        textTransform: 'uppercase',
        color: colors.textTertiary,
        marginBottom: '6px'
      }}>
        Current Site
      </div>
      <div style={{ 
        fontSize: '13px',
        color: colors.textSecondary,
        marginBottom: '16px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {domain || 'No site detected'}
      </div>

      {/* Protection Toggle */}
      <button
        onClick={toggleProtection}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: enabled ? colors.primary : colors.surface,
          color: enabled ? colors.background : colors.textSecondary,
          border: enabled ? 'none' : `1px solid ${colors.border}`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          letterSpacing: '0.5px',
          transition: 'all 0.2s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>Protection</span>
        <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
          {enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Tracker Alert */}
      {detections.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: colors.surfaceAlt,
          borderRadius: '6px',
          fontSize: '11px',
          color: colors.textSecondary,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Trackers detected</span>
          <span style={{ color: colors.text, fontWeight: '500' }}>{detections.length}</span>
        </div>
      )}
    </div>

    {/* Privacy Level Selector */}
    {enabled && (
      <div style={{ marginTop: '16px' }}>
        <div style={{ 
          fontSize: '10px', 
          letterSpacing: '1px', 
          textTransform: 'uppercase',
          color: colors.textTertiary,
          marginBottom: '10px'
        }}>
          Privacy Level
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['low', 'medium', 'high'] as PrivacyLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => changePrivacyLevel(level)}
              style={{
                flex: 1,
                padding: '10px 6px',
                backgroundColor: privacyLevel === level ? colors.primary : 'transparent',
                color: privacyLevel === level ? colors.background : colors.textSecondary,
                border: privacyLevel === level ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: privacyLevel === level ? '600' : '400',
                letterSpacing: '0.5px',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {level}
            </button>
          ))}
        </div>
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          color: colors.textTertiary,
          textAlign: 'center'
        }}>
          {privacyLevel === 'low' && '10-20ms delay'}
          {privacyLevel === 'medium' && '20-45ms delay'}
          {privacyLevel === 'high' && '40-80ms delay'}
        </div>
      </div>
    )}
  </div>
);

/**
 * Stats View
 */
const StatsView: React.FC<{
  colors: ReturnType<typeof getThemeColors>;
}> = ({ colors }) => {
  const [stats, setStats] = useState<Statistics | null>(null);

  useEffect(() => {
    Messaging.sendToBackground({ type: MessageType.GET_STATISTICS })
      .then(response => setStats(response.statistics as Statistics))
      .catch(err => Logger.error('Failed to load stats:', err));
  }, []);

  return (
    <div style={{ padding: '20px', flex: 1 }}>
      <div style={{ 
        fontSize: '10px', 
        letterSpacing: '1px', 
        textTransform: 'uppercase',
        color: colors.textTertiary,
        marginBottom: '16px'
      }}>
        Statistics
      </div>
      
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <StatBox label="Blocked" value={stats.trackersBlocked || 0} colors={colors} />
          <StatBox label="Sites" value={stats.sitesProtected || 0} colors={colors} />
          <StatBox label="Events" value={formatNumber(stats.eventsObfuscated || 0)} colors={colors} />
          <StatBox label="Hours" value={formatHours(stats.protectionHours || 0)} colors={colors} />
        </div>
      ) : (
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Loading...</div>
      )}
    </div>
  );
};

/**
 * Settings View
 */
const SettingsView: React.FC<{
  colors: ReturnType<typeof getThemeColors>;
  onAdvanced: () => void;
  onReport: () => void;
}> = ({ colors, onAdvanced, onReport }) => {
  
  const exportSettings = async () => {
    try {
      const response = await Messaging.sendToBackground({ type: MessageType.EXPORT_SETTINGS });
      const blob = new Blob([JSON.stringify(response.settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kala-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      Logger.error('Export failed:', err);
    }
  };

  const resetStats = async () => {
    if (confirm('Reset all statistics?')) {
      await Messaging.sendToBackground({ type: MessageType.RESET_STATISTICS });
    }
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div style={{ padding: '20px', flex: 1 }}>
      <div style={{ 
        fontSize: '10px', 
        letterSpacing: '1px', 
        textTransform: 'uppercase',
        color: colors.textTertiary,
        marginBottom: '16px'
      }}>
        Settings
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={onAdvanced} style={buttonStyle}>
          <span>Advanced Protections</span>
          <span style={{ color: colors.textTertiary }}>→</span>
        </button>
        <button onClick={onReport} style={buttonStyle}>
          <span>Privacy Report</span>
          <span style={{ color: colors.textTertiary }}>→</span>
        </button>
        <button onClick={exportSettings} style={buttonStyle}>
          <span>Export Settings</span>
          <span style={{ color: colors.textTertiary, fontSize: '10px' }}>JSON</span>
        </button>
        <button onClick={resetStats} style={buttonStyle}>
          <span>Reset Statistics</span>
          <span />
        </button>
      </div>
    </div>
  );
};

/**
 * Advanced Protections View
 * Paginated for clean, no-scroll experience
 */
const AdvancedView: React.FC<{
  colors: ReturnType<typeof getThemeColors>;
  onBack: () => void;
}> = ({ colors, onBack }) => {
  // All protections in one state object
  const [protections, setProtections] = useState({
    // Core protections
    mlEvasion: true,
    digraphNoise: true,
    sessionRandomization: true,
    gaussianDistribution: true,
    microJitter: true,
    performanceCoarsening: true,
    // Extended protections
    touchObfuscation: true,
    deviceMotion: true,
    rafTiming: true,
    interactionPatterns: true
  });
  
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(0);

  // Load settings on mount
  useEffect(() => {
    Messaging.sendToBackground({ type: MessageType.GET_SETTINGS })
      .then(response => {
        const ap = response.settings?.advancedProtections || {};
        const v2 = response.settings?.advancedProtectionsV2 || {};
        setProtections({
          mlEvasion: ap.mlEvasion ?? true,
          digraphNoise: ap.digraphNoise ?? true,
          sessionRandomization: ap.sessionRandomization ?? true,
          gaussianDistribution: ap.gaussianDistribution ?? true,
          microJitter: ap.microJitter ?? true,
          performanceCoarsening: ap.performanceCoarsening ?? true,
          touchObfuscation: v2.touchObfuscation ?? true,
          deviceMotion: v2.deviceMotionProtection ?? true,
          rafTiming: v2.rafTimingProtection ?? true,
          interactionPatterns: v2.interactionPatternProtection ?? true
        });
      })
      .catch(err => Logger.error('Failed to load settings:', err));
  }, []);

  const toggle = (key: keyof typeof protections) => {
    setProtections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    try {
      await Messaging.sendToBackground({
        type: MessageType.UPDATE_SETTINGS,
        payload: {
          advancedProtections: {
            mlEvasion: protections.mlEvasion,
            digraphNoise: protections.digraphNoise,
            sessionRandomization: protections.sessionRandomization,
            gaussianDistribution: protections.gaussianDistribution,
            microJitter: protections.microJitter,
            performanceCoarsening: protections.performanceCoarsening
          },
          advancedProtectionsV2: {
            touchObfuscation: protections.touchObfuscation,
            deviceMotionProtection: protections.deviceMotion,
            rafTimingProtection: protections.rafTiming,
            interactionPatternProtection: protections.interactionPatterns
          }
        }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Logger.error('Failed to save settings:', err);
    }
  };

  // Protection items - split into pages
  const pages = [
    [
      { key: 'mlEvasion' as const, label: 'ML Evasion' },
      { key: 'digraphNoise' as const, label: 'Digraph Noise' },
      { key: 'sessionRandomization' as const, label: 'Session Variance' },
      { key: 'gaussianDistribution' as const, label: 'Gaussian Distribution' },
      { key: 'microJitter' as const, label: 'Micro Jitter' }
    ],
    [
      { key: 'performanceCoarsening' as const, label: 'Timing Coarsening' },
      { key: 'touchObfuscation' as const, label: 'Touch Obfuscation' },
      { key: 'deviceMotion' as const, label: 'Device Motion' },
      { key: 'rafTiming' as const, label: 'Frame Timing' },
      { key: 'interactionPatterns' as const, label: 'Interaction Patterns' }
    ]
  ];

  const currentItems = pages[page];
  const totalPages = pages.length;

  return (
    <div style={{ 
      padding: '16px', 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%'
    }}>
      {/* Header with page nav */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '16px',
              padding: 0
            }}
          >
            ←
          </button>
          <span style={{ 
            fontSize: '10px', 
            letterSpacing: '1px', 
            textTransform: 'uppercase',
            color: colors.textTertiary
          }}>
            Advanced
          </span>
        </div>
        
        {/* Page indicator & arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              background: 'none',
              border: 'none',
              color: page === 0 ? colors.border : colors.text,
              cursor: page === 0 ? 'default' : 'pointer',
              fontSize: '14px',
              padding: '4px',
              opacity: page === 0 ? 0.3 : 1,
              transition: 'opacity 0.15s ease'
            }}
          >
            ‹
          </button>
          
          {/* Dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: i === page ? colors.primary : colors.border,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              />
            ))}
          </div>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              background: 'none',
              border: 'none',
              color: page === totalPages - 1 ? colors.border : colors.text,
              cursor: page === totalPages - 1 ? 'default' : 'pointer',
              fontSize: '14px',
              padding: '4px',
              opacity: page === totalPages - 1 ? 0.3 : 1,
              transition: 'opacity 0.15s ease'
            }}
          >
            ›
          </button>
        </div>
      </div>
      
      {/* Toggles - fixed content, no scroll */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentItems.map(({ key, label }) => (
          <Toggle 
            key={key}
            label={label} 
            enabled={protections[key]} 
            onChange={() => toggle(key)} 
            colors={colors}
          />
        ))}
      </div>

      {/* Save - fixed at bottom */}
      <button
        onClick={saveSettings}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: saved ? colors.surfaceAlt : colors.primary,
          color: saved ? colors.textSecondary : colors.background,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
      >
        {saved ? 'Saved ✓' : 'Save Changes'}
      </button>
    </div>
  );
};

/**
 * Privacy Report View
 */
const ReportView: React.FC<{
  colors: ReturnType<typeof getThemeColors>;
  onBack: () => void;
}> = ({ colors, onBack }) => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    Promise.all([
      Messaging.sendToBackground({ type: MessageType.GET_STATISTICS }),
      Messaging.sendToBackground({ type: MessageType.GET_DETECTIONS })
    ]).then(([statsRes, detectionsRes]) => {
      setStats(statsRes.statistics as Statistics);
      setDetections(detectionsRes.detections || []);
    }).catch(err => Logger.error('Failed to load report data:', err));
  }, []);

  const exportJSON = () => {
    const report = {
      generated: new Date().toISOString(),
      statistics: stats,
      detections: detections,
      summary: {
        trackersBlocked: stats?.trackersBlocked || 0,
        sitesProtected: stats?.sitesProtected || 0,
        eventsObfuscated: stats?.eventsObfuscated || 0,
        protectionHours: stats?.protectionHours || 0
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kala-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const highSeverity = detections.filter(d => d.severity === 'high').length;
  const mediumSeverity = detections.filter(d => d.severity === 'medium').length;

  return (
    <div style={{ 
      padding: '16px', 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '16px',
            padding: 0
          }}
        >
          ←
        </button>
        <span style={{ 
          fontSize: '10px', 
          letterSpacing: '1px', 
          textTransform: 'uppercase',
          color: colors.textTertiary
        }}>
          Privacy Report
        </span>
      </div>
      
      {/* Stats Grid - compact layout */}
      {stats ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
          {/* Main stat - compact */}
          <div style={{ 
            padding: '16px',
            backgroundColor: colors.surfaceAlt,
            borderRadius: '8px',
            textAlign: 'center',
            flexShrink: 0
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700' }}>
              {stats.trackersBlocked || 0}
            </div>
            <div style={{ fontSize: '10px', color: colors.textTertiary, marginTop: '2px' }}>
              Trackers Blocked
            </div>
          </div>
          
          {/* Secondary stats - compact */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', flexShrink: 0 }}>
            <div style={{ padding: '10px 6px', backgroundColor: colors.surface, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{stats.sitesProtected || 0}</div>
              <div style={{ fontSize: '8px', color: colors.textTertiary }}>Sites</div>
            </div>
            <div style={{ padding: '10px 6px', backgroundColor: colors.surface, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{formatNumber(stats.eventsObfuscated || 0)}</div>
              <div style={{ fontSize: '8px', color: colors.textTertiary }}>Events</div>
            </div>
            <div style={{ padding: '10px 6px', backgroundColor: colors.surface, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{formatHours(stats.protectionHours || 0)}</div>
              <div style={{ fontSize: '8px', color: colors.textTertiary }}>Hours</div>
            </div>
          </div>

          {/* Detections row - compact */}
          <div style={{ 
            padding: '10px 12px',
            backgroundColor: colors.surface,
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            flexShrink: 0
          }}>
            <span style={{ color: colors.textTertiary }}>Detections</span>
            <span>
              <span style={{ marginRight: '10px' }}>High: <strong>{highSeverity}</strong></span>
              <span style={{ marginRight: '10px' }}>Med: <strong>{mediumSeverity}</strong></span>
              <span>Low: <strong>{detections.length - highSeverity - mediumSeverity}</strong></span>
            </span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Loading...</div>
        </div>
      )}

      {/* Export button - ALWAYS visible */}
      <button
        onClick={exportJSON}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: '12px',
          backgroundColor: exported ? colors.surfaceAlt : colors.primary,
          color: exported ? colors.textSecondary : colors.background,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
      >
        {exported ? 'Exported ✓' : 'Export Report'}
      </button>
    </div>
  );
};

/**
 * Toggle Component
 */
const Toggle: React.FC<{
  label: string;
  desc?: string;
  enabled: boolean;
  onChange: () => void;
  colors: ReturnType<typeof getThemeColors>;
}> = ({ label, desc, enabled, onChange, colors }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`
  }}>
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: '11px', color: colors.text, display: 'block' }}>{label}</span>
      {desc && <span style={{ fontSize: '8px', color: colors.textTertiary }}>{desc}</span>}
    </div>
    <button
      onClick={onChange}
      style={{
        width: '32px',
        height: '18px',
        backgroundColor: enabled ? colors.primary : colors.surface,
        border: enabled ? 'none' : `1px solid ${colors.border}`,
        borderRadius: '9px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: enabled ? '16px' : '2px',
        width: '14px',
        height: '14px',
        backgroundColor: enabled ? colors.background : colors.textTertiary,
        borderRadius: '50%',
        transition: 'all 0.2s ease'
      }} />
    </button>
  </div>
);

/**
 * Onboarding View
 */
const OnboardingView: React.FC<{
  colors: ReturnType<typeof getThemeColors>;
  onComplete: (level: PrivacyLevel) => void;
}> = ({ colors, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLevel, setSelectedLevel] = useState<PrivacyLevel>('medium');

  const baseStyle: React.CSSProperties = {
    width: '320px',
    height: '400px',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 24px',
    overflow: 'hidden'
  };

  if (step === 1) {
    return (
      <div style={baseStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <img 
            src={chrome.runtime.getURL('assets/logo.png')} 
            alt="Kala" 
            style={{ width: '72px', height: '72px', marginBottom: '20px' }} 
          />
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Welcome to Kala
          </h1>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.textSecondary, marginBottom: '24px' }}>
            Protect your privacy from behavioral tracking. 
            Kala obfuscates your typing and mouse patterns.
          </p>
          <div style={{
            padding: '16px',
            backgroundColor: colors.surfaceAlt,
            borderRadius: '8px',
            fontSize: '12px',
            color: colors.textSecondary,
            lineHeight: '1.5'
          }}>
            All processing happens locally. No data leaves your browser.
          </div>
        </div>
        <button
          onClick={() => setStep(2)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: colors.primary,
            color: colors.background,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: '8px' }}>
          Step 2 of 2
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', letterSpacing: '-0.5px' }}>
          Choose Privacy Level
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {([
            { level: 'low' as PrivacyLevel, title: 'Low', desc: '10-20ms delay' },
            { level: 'medium' as PrivacyLevel, title: 'Medium', desc: '20-45ms delay' },
            { level: 'high' as PrivacyLevel, title: 'High', desc: '40-80ms delay' }
          ]).map(({ level, title, desc }) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: selectedLevel === level ? colors.primary : 'transparent',
                color: selectedLevel === level ? colors.background : colors.text,
                border: selectedLevel === level ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => onComplete(selectedLevel)}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: colors.primary,
          color: colors.background,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        Get Started
      </button>
    </div>
  );
};

/**
 * Stat Box
 */
const StatBox: React.FC<{
  label: string;
  value: string | number;
  colors: ReturnType<typeof getThemeColors>;
}> = ({ label, value, colors }) => (
  <div style={{
    padding: '16px',
    backgroundColor: colors.surfaceAlt,
    borderRadius: '8px'
  }}>
    <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.5px', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
      {value}
    </div>
  </div>
);

// Helpers
const formatNumber = (n: number): string => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
const formatHours = (h: number): string => h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
