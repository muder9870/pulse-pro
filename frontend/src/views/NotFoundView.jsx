import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * NotFoundView - 404 Page Not Found
 * Displays when user navigates to a non-existent route
 */
const NotFoundView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700/50">
              <Search className="w-12 h-12 text-slate-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <span className="text-indigo-400 font-bold text-lg">?</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          Page Not Found
        </h2>
        
        <p className="text-slate-400 text-base mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. 
          Check the URL or navigate back to the dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-slate-800/50">
          <p className="text-slate-500 text-sm">
            Need help? Check the{' '}
            <button 
              onClick={() => navigate('/settings')}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              Settings
            </button>{' '}
            or{' '}
            <a 
              href="https://github.com/your-repo/pulse-pro/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              report an issue
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundView;
