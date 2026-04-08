import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Token Reference Page
 * 
 * Complete reference for all design tokens, CSS variables,
 * typography scale, spacing, shadows, and radius values.
 * 
 * Accessible at /dev/tokens in development mode.
 */
const TokenReference = () => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Design Tokens</h1>
        <p className="text-gray-600">Token reference is only available in development mode.</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const colorTokens = [
    { name: '--primary', value: '221.2 83.2% 53.3%', desc: 'Brand primary (indigo)' },
    { name: '--primary-foreground', value: '210 40% 98%', desc: 'Text on primary' },
    { name: '--background', value: '0 0% 100%', desc: 'Page background (light)' },
    { name: '--foreground', value: '222.2 84% 4.9%', desc: 'Text color (light)' },
    { name: '--card', value: '0 0% 100%', desc: 'Card background' },
    { name: '--card-foreground', value: '222.2 84% 4.9%', desc: 'Card text' },
    { name: '--destructive', value: '0 84.2% 60.2%', desc: 'Error/delete states' },
    { name: '--destructive-foreground', value: '210 40% 98%', desc: 'Text on destructive' },
  ];

  const semanticColors = [
    { name: '--success', value: '#10b981', dark: '#34d399', desc: 'Success states' },
    { name: '--warning', value: '#f59e0b', dark: '#fbbf24', desc: 'Warning states' },
    { name: '--error', value: '#ef4444', dark: '#f87171', desc: 'Error states' },
    { name: '--info', value: '#3b82f6', dark: '#60a5fa', desc: 'Info states' },
  ];

  const shadows = [
    { name: '--shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', usage: 'Subtle elevation' },
    { name: '--shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', usage: 'Buttons, inputs' },
    { name: '--shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1)', usage: 'Cards, dropdowns' },
    { name: '--shadow-xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1)', usage: 'Modals, dialogs' },
    { name: '--shadow-2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)', usage: 'Overlays, toasts' },
  ];

  const spacing = [
    { token: '--space-1', rem: '0.25rem', px: '4px', usage: 'Micro spacing' },
    { token: '--space-2', rem: '0.5rem', px: '8px', usage: 'Tight gaps' },
    { token: '--space-3', rem: '0.75rem', px: '12px', usage: 'Button padding' },
    { token: '--space-4', rem: '1rem', px: '16px', usage: 'Standard gap' },
    { token: '--space-6', rem: '1.5rem', px: '24px', usage: 'Section gaps' },
    { token: '--space-8', rem: '2rem', px: '32px', usage: 'Large sections' },
    { token: '--space-12', rem: '3rem', px: '48px', usage: 'Page padding' },
  ];

  const typography = [
    { role: 'Page Title', classes: 'text-3xl font-bold', size: '30px', usage: 'Single H1 per view' },
    { role: 'Section Title', classes: 'text-xl font-semibold', size: '20px', usage: 'Card headers' },
    { role: 'Card Title', classes: 'text-lg font-medium', size: '18px', usage: 'Story titles' },
    { role: 'Body', classes: 'text-base leading-relaxed', size: '16px', usage: 'Paragraphs, content' },
    { role: 'Small', classes: 'text-sm', size: '14px', usage: 'Metadata, labels' },
    { role: 'Caption', classes: 'text-xs', size: '12px', usage: 'Timestamps, hints' },
    { role: 'Label', classes: 'text-[9px] uppercase tracking-widest', size: '9px', usage: 'Nav section labels' },
  ];

  const radius = [
    { token: '--radius', value: '0.5rem', px: '8px', usage: 'Base radius' },
    { class: 'rounded-lg', value: '0.5rem', usage: 'Small elements' },
    { class: 'rounded-xl', value: '0.75rem', usage: 'Buttons, inputs' },
    { class: 'rounded-2xl', value: '1rem', usage: 'Cards, modals' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dev" className="text-blue-600 hover:underline">
          ← Back to DevTools
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2">Design Tokens Reference</h1>
      <p className="text-gray-600 mb-8">Complete reference for all CSS variables, colors, spacing, and typography.</p>

      {/* Brand Gradient */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Brand Gradient</h2>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
          <code className="text-sm font-mono">--brand-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)</code>
          <p className="text-sm mt-2 opacity-80">Use for hero sections, primary CTAs, accent highlights</p>
        </div>
      </section>

      {/* Color Tokens */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Color Tokens (HSL)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <code className="text-sm font-mono text-blue-600">{token.name}</code>
              <p className="text-sm text-gray-600 mt-1">{token.value}</p>
              <p className="text-xs text-gray-500 mt-1">{token.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Semantic Colors */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Semantic Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {semanticColors.map((color) => (
            <div key={color.name} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg shadow-inner"
                style={{ backgroundColor: color.value }}
              />
              <div>
                <code className="text-sm font-mono text-blue-600">{color.name}</code>
                <p className="text-sm text-gray-600">{color.value} (dark: {color.dark})</p>
                <p className="text-xs text-gray-500">{color.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Shadows</h2>
        <div className="space-y-3">
          {shadows.map((shadow) => (
            <div key={shadow.name} className="p-4 bg-white rounded-xl border border-gray-200" style={{ boxShadow: shadow.value }}>
              <div className="flex justify-between items-center">
                <code className="text-sm font-mono text-blue-600">{shadow.name}</code>
                <span className="text-sm text-gray-500">{shadow.usage}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-mono">{shadow.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Spacing Scale</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Token</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">REM</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pixels</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usage</th>
              </tr>
            </thead>
            <tbody>
              {spacing.map((s) => (
                <tr key={s.token} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-blue-600">{s.token}</td>
                  <td className="px-4 py-3">{s.rem}</td>
                  <td className="px-4 py-3">{s.px}</td>
                  <td className="px-4 py-3 text-gray-600">{s.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Typography Scale</h2>
        <div className="space-y-4">
          {typography.map((t) => (
            <div key={t.role} className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <p className={t.classes}>{t.role}</p>
                <p className="text-xs text-gray-500 mt-1">{t.usage}</p>
              </div>
              <div className="text-right">
                <code className="text-xs font-mono text-blue-600">{t.classes}</code>
                <p className="text-xs text-gray-400">{t.size}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Radius */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Border Radius</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {radius.map((r) => (
            <div key={r.token || r.class} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
              <div className={`w-12 h-12 bg-indigo-500 ${r.class || ''}`} style={{ borderRadius: r.value }} />
              <div>
                <code className="text-sm font-mono text-blue-600">{r.token || r.class}</code>
                <p className="text-sm text-gray-600">{r.value}</p>
                <p className="text-xs text-gray-500">{r.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TokenReference;
