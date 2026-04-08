import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { Card, Button } from './ui';

const ThemeManager = ({ activeTheme }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pulse-theme') || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      } else {
        root.classList.remove('light', 'dark');
        root.classList.add(t);
      }
    };

    applyTheme(theme);
    localStorage.setItem('pulse-theme', theme);
    window.dispatchEvent(new CustomEvent('pulse-theme-change', { detail: { theme } }));

    // Listen for system theme changes if set to 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <Card variant="glass" padding="lg" className={`${activeTheme === 'dark' ? 'border-indigo-500/20' : 'border-slate-200'}`}>
      <Card.Header>
        <Card.Title className={activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}>Theme Management</Card.Title>
        <Card.Description>Personalize your AI Pulse Pro experience</Card.Description>
      </Card.Header>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all relative ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10 border-indigo-500' 
                  : `${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-900/60' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-100'}`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isActive ? 'bg-white/20 border-white/20' : `${activeTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`
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
      
      <div className={`mt-8 p-4 rounded-xl border transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
        <p className={`text-[10px] font-medium leading-relaxed ${activeTheme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
          System theme automatically syncs with your OS settings. Dark mode is optimized for high-density data analysis and long sessions.
        </p>
      </div>
    </Card>
  );
};

export default ThemeManager;
