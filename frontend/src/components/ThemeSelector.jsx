import React, { useState } from 'react';
import { Sun, Moon, Zap, Laptop, Check, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

const ThemeSelector = ({ activeTheme }) => {
  const { theme, setTheme } = useTheme();
  const [success, setSuccess] = useState(null);

  const themes = [
    { id: 'light', label: 'Light Mode', icon: Sun, description: 'Clean light theme with indigo accents' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, description: 'Dark theme with indigo accents' },
    { id: 'electric-azure-light', label: 'Azure Light', icon: Zap, description: 'Vibrant cyan/teal theme (light)' },
    { id: 'electric-azure-dark', label: 'Azure Dark', icon: Zap, description: 'Vibrant cyan/teal theme (dark)' },
    { id: 'system', label: 'System', icon: Laptop, description: 'Automatically follow OS preference' }
  ];

  const handleThemeChange = (themeId) => {
    setTheme(themeId);
    const themeName = themes.find(t => t.id === themeId)?.label || themeId;
    setSuccess(`Theme changed to ${themeName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          Interface Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
          Customize your Pulse Pro experience
        </p>
      </div>

      {/* Success Toast */}
      {success && (
        <div style={{ 
          padding: 16, 
          background: 'var(--green-dim)', 
          border: '1px solid var(--green)', 
          color: 'var(--green)', 
          borderRadius: 10, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12 
        }}>
          <CheckCircle2 style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13 }}>{success}</span>
        </div>
      )}

      {/* Theme Toggle Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {themes.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleThemeChange(opt.id)}
              className={`interface-row ${isActive ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', outline: 'none' }}
            >
              <div className="interface-icon">
                <Icon style={{ width: 16, height: 16 }} />
              </div>
              <div className="interface-info">
                <div className="interface-name">{opt.label}</div>
                <div className="interface-desc">{opt.description}</div>
              </div>
              <div className={`toggle ${isActive ? 'on' : 'off'}`} />
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      <div style={{
        padding: 16, background: 'var(--bg3)', borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Electric Azure</strong> uses cyan/teal colors for a vibrant, modern aesthetic. System theme automatically syncs with your OS preferences.
        </p>
      </div>
    </div>
  );
};

export default ThemeSelector;
