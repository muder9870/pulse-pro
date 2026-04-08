import React from 'react';
import { Clock } from 'lucide-react';

/**
 * StubPublisherBadge
 * Shows a "Coming soon" or "Not yet implemented" indicator on publisher buttons
 * that are not yet functional (Instagram, Facebook, Reddit, Threads, YouTube, etc.)
 * 
 * This prevents user confusion by clearly marking unimplemented features rather than
 * leaving dead buttons with no feedback.
 * 
 * @param {Object} props
 * @param {string} props.label - Optional custom label (default: "soon")
 * @param {string} props.variant - Badge style: 'badge' | 'button' | 'overlay'
 * @param {React.ReactNode} props.children - Content to wrap (for overlay variant)
 */
const StubPublisherBadge = ({ 
  label = 'soon', 
  variant = 'badge',
  children 
}) => {
  // Small badge for nav items
  if (variant === 'badge') {
    return (
      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full border border-amber-500/30">
        <Clock className="w-3 h-3" />
        {label}
      </span>
    );
  }

  // For buttons - shows the button but disabled with tooltip-like indicator
  if (variant === 'button') {
    return (
      <span className="relative inline-flex">
        {children}
        <span className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-medium rounded-full border border-amber-500/30">
          {label}
        </span>
      </span>
    );
  }

  // Full overlay for cards or larger elements
  if (variant === 'overlay') {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-2">
          <Clock className="w-6 h-6 text-amber-400" />
          <span className="text-amber-400 text-sm font-medium">
            Coming {label}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default StubPublisherBadge;
