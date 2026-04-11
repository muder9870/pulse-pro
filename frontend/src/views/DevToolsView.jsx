import React from 'react';
import { Link } from 'react-router-dom';

/**
 * DevTools View
 * 
 * Internal development tools and component showcase.
 * Only accessible in development mode or for admins.
 * 
 * Includes:
 * - Theme token reference
 * - Component showcase
 * - Accessibility testing utilities
 */
const DevToolsView = () => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Developer Tools</h1>
        <p className="text-gray-600">These tools are only available in development mode.</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Developer Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Theme Tokens */}
        <Link 
          to="/dev/theme"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Theme Tokens</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Reference for all CSS variables, colors, and design tokens.
          </p>
        </Link>
        
        {/* Component Showcase */}
        <Link 
          to="/dev/components"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Component Showcase</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive preview of all UI components with theme variants.
          </p>
        </Link>
        
        {/* Accessibility Audit */}
        <Link 
          to="/dev/a11y"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Accessibility Audit</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Run axe-core checks and view accessibility reports.
          </p>
        </Link>
        
        {/* API Testing */}
        <Link 
          to="/dev/api"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">API Testing</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Test backend endpoints and view responses.
          </p>
        </Link>
        
        {/* State Debug */}
        <Link 
          to="/dev/state"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">State Debugger</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Inspect React Query cache and Zustand stores.
          </p>
        </Link>
        
        {/* Feature Flags */}
        <Link 
          to="/dev/flags"
          className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Feature Flags</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Toggle feature flags for testing.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default DevToolsView;
