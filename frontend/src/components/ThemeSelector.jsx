import React from 'react';
import { Sun, Moon, Zap, Laptop, Check } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

const ThemeSelector = ({ activeTheme }) => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', label: 'Light Mode', icon: Sun, description: 'Clean light theme with indigo accents' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, description: 'Dark theme with indigo accents' },
    { id: 'electric-azure-light', label: 'Azure Light', icon: Zap, description: 'Vibrant cyan/teal theme (light)' },
    { id: 'electric-azure-dark', label: 'Azure Dark', icon: Zap, description: 'Vibrant cyan/teal theme (dark)' },
    { id: 'system', label: 'System', icon: Laptop, description: 'Automatically follow OS preference' }
  ];

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

      {/* Theme Toggle Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {themes.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: 12,
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: isActive ? 'var(--accent-glow)' : 'var(--surface)',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border2)';
                  e.currentTarget.style.background = 'var(--surface2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--surface)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--accent)' : 'var(--bg3)',
                  transition: 'background 0.15s',
                }}>
                  <Icon style={{ width: 20, height: 20, color: isActive ? 'white' : 'var(--text2)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text)' }}>
                    {opt.label}
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    {opt.description}
                  </p>
                </div>
              </div>

              {/* Toggle Indicator */}
              <div style={{
                width: 48, height: 26, borderRadius: 13,
                background: isActive ? 'var(--accent)' : 'var(--bg3)',
                display: 'flex', alignItems: 'center', padding: 3,
                transition: 'background 0.15s', flexShrink: 0,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10,
                  background: isActive ? 'white' : 'var(--text3)',
                  transition: 'transform 0.15s',
                  transform: isActive ? 'translateX(22px)' : 'translateX(0)',
                }} />
              </div>
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
