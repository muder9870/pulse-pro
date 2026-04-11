import React from 'react';
import { Sun, Moon, Zap, Laptop, Check } from 'lucide-react';
import { Card } from './ui';
import { useTheme } from '../theme/ThemeProvider';

const ThemeSelector = ({ activeTheme }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || theme === 'electric-azure-dark';

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Light mode with indigo accents' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Dark mode with indigo accents' },
    { id: 'electric-azure-light', label: 'Azure Light', icon: Zap, description: 'Cyan/teal theme (light)' },
    { id: 'electric-azure-dark', label: 'Azure Dark', icon: Zap, description: 'Cyan/teal theme (dark)' },
    { id: 'system', label: 'System', icon: Laptop, description: 'Follow OS preference' }
  ];

  return (
    <Card variant="glass" padding="lg" className={`${isDark ? 'border-indigo-500/20' : 'border-slate-200'}`}>
      <Card.Header>
        <Card.Title className={isDark ? 'text-white' : 'text-slate-900'}>Theme Management</Card.Title>
        <Card.Description>Personalize your AI Pulse Pro experience</Card.Description>
      </Card.Header>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        {themes.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10 border-indigo-500'
                  : `${isDark ? 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-900/60' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-100'}`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isActive ? 'bg-white/20 border-white/20' : `${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`
              }`}>
                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : ''}`}>{opt.label}</span>

              {isActive && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`mt-8 p-4 rounded-xl border transition-colors duration-500 ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
        <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
          Electric Azure uses cyan/teal colors for a vibrant, modern look. System theme automatically syncs with your OS settings.
        </p>
      </div>
    </Card>
  );
};

export default ThemeSelector;
