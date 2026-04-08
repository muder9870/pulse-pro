import React from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * PageHeader Component
 * 
 * Consistent page header with title, subtitle, and optional back button.
 * Supports source folder variant with clear "back to all" navigation.
 * 
 * @param {Object} props
 * @param {string} props.title - Main page title
 * @param {string} props.subtitle - Optional subtitle/description
 * @param {Function} props.onBack - Optional back button handler
 * @param {boolean} props.isSourceFolder - Whether showing source folder view
 * @param {string} props.activeTheme - Current theme
 */
export default function PageHeader({
  title,
  subtitle,
  onBack,
  isSourceFolder = false,
  activeTheme = 'dark',
}) {
  const isDark = activeTheme === 'dark';

  return (
    <div className={`mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        {isSourceFolder && (
          <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <FolderOpen className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl font-bold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {isSourceFolder && onBack && (
        <p className={`text-xs mt-2 ml-11 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <Button variant="link" size="sm" onClick={onBack} className="h-auto p-0">
            ← Back to all sources
          </Button>
        </p>
      )}
    </div>
  );
}
