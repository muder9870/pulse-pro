import React from 'react';
import { Sparkles } from 'lucide-react';
import Badge from '../ui/Badge';

const StoryMetrics = ({ story }) => {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform cursor-help group/score">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{story.total_score || 0}</div>
            <div className="text-[8px] text-white/80 uppercase tracking-wider">Score</div>
          </div>
          
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-900/90 text-[10px] text-white rounded shadow-xl opacity-0 group-hover/score:opacity-100 transition-opacity pointer-events-none z-20 glass-morphism">
            <div className="flex justify-between"><span>Viral:</span> <span>{story.viral_score}</span></div>
            <div className="flex justify-between"><span>Tech:</span> <span>{story.tech_score}</span></div>
            <div className="flex justify-between"><span>Relevance:</span> <span>{story.relevance_score}</span></div>
          </div>
        </div>

        {/* Viral Badge */}
        {story.viral_score > 70 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow-md animate-bounce group/viral" title="High Viral Potential">
            <Sparkles className="w-3 h-3 text-white" />
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-purple-600 text-[9px] text-white rounded opacity-0 group-hover/viral:opacity-100 transition-opacity whitespace-nowrap z-30 font-bold glass-morphism border-purple-400">
              VIRAL BREAKOUT POTENTIAL
            </div>
          </div>
        )}
      </div>

      {/* Technical Badge */}
      {story.tech_score > 70 && (
        <Badge variant="success" size="md" className="border border-green-200">
          Technical
        </Badge>
      )}
    </div>
  );
};

export default StoryMetrics;
