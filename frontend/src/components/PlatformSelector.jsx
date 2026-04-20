import React from 'react';
import { Clock } from 'lucide-react';

const PLATFORMS = [
  { id: 'twitter',   label: 'Twitter / X', implemented: true },
  { id: 'linkedin',  label: 'LinkedIn',    implemented: true },
  { id: 'blog',      label: 'Blog / Article', implemented: true },
  { id: 'instagram', label: 'Instagram',   implemented: true },
  { id: 'facebook',  label: 'Facebook',    implemented: true },
  { id: 'reddit',    label: 'Reddit',      implemented: true },
  { id: 'youtube',   label: 'YouTube',     implemented: true },
  { id: 'threads',   label: 'Threads',     implemented: true },
  { id: 'medium',    label: 'Medium',      implemented: false },
  { id: 'telegram',  label: 'Telegram',    implemented: false },
  { id: 'discord',   label: 'Discord',     implemented: false },
  { id: 'newsletter', label: 'Newsletter',  implemented: false },
  { id: 'tiktok',    label: 'TikTok',      implemented: false },
];

// Unimplemented platforms list for Coming Soon section
const COMING_SOON_PLATFORMS = PLATFORMS.filter(p => !p.implemented).map(p => p.label);

export default function PlatformSelector({ selected, onChange }) {
  const togglePlatform = (platform) => {
    if (selected.includes(platform)) {
      onChange(selected.filter(p => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Target Platforms</h2>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(({ id, label, implemented }) => (
          <button
            key={id}
            onClick={() => implemented && togglePlatform(id)}
            disabled={!implemented}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all relative
              ${selected.includes(id) 
                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                : implemented
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'}
            `}
          >
            {label}
            {!implemented && (
              <span className="ml-1.5 inline-flex items-center text-[10px] text-amber-500">
                <Clock className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        <span className="text-amber-500 font-medium">Coming soon:</span> {COMING_SOON_PLATFORMS.join(', ')}
      </p>
    </div>
  );
}
