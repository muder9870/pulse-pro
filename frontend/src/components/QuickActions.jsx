import React from 'react';
import { RefreshCw, Sparkles, Calendar, Download, Zap, ChevronRight, Rocket } from 'lucide-react';

export default function QuickActions({
  onFetchData,
  onGenerateContent,
  onSchedule,
  onExport,
  pipelineRunning,
  processedCount,
  variant = 'full'
}) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 backdrop-blur-sm group">
        <div className="flex items-center gap-2 pr-4 border-r border-indigo-500/20">
          <Rocket className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest whitespace-nowrap">Ready to Launch</span>
          {processedCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/30">
              {processedCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onFetchData}
            disabled={pipelineRunning}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${pipelineRunning
                ? 'bg-slate-800 text-slate-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
              }`}
          >
            <RefreshCw className={`w-3 h-3 ${pipelineRunning ? 'animate-spin' : ''}`} />
            {pipelineRunning ? 'Syncing...' : 'Fetch'}
          </button>

          <div className="flex gap-1">
            {processedCount > 0 && (
              <button
                onClick={onGenerateContent}
                className="p-1.5 hover:bg-white/10 text-indigo-300 rounded-lg transition-colors"
                title="Generate Content"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onSchedule}
              className="p-1.5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors"
              title="Schedule"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={onExport}
              className="p-1.5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
      {/* Subtle background effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autonomous Sync Active</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            Ready to <span className="text-indigo-400">Launch?</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            {processedCount > 0
              ? `${processedCount} intelligence items are analyzed and ready for high-fidelity content generation.`
              : 'The system is ready. Fetch new data streams to begin the intelligence analysis pipeline.'
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-end">
          <button
            onClick={onFetchData}
            disabled={pipelineRunning}
            className={`group/btn relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${pipelineRunning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:translate-y-0'
              }`}
          >
            <RefreshCw className={`w-4 h-4 ${pipelineRunning ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
            {pipelineRunning ? 'Running...' : 'Fetch Streams'}
          </button>

          <div className="h-10 w-px bg-white/10 hidden lg:block mx-2"></div>

          <div className="flex gap-3">
            {processedCount > 0 && (
              <button
                onClick={onGenerateContent}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-center group/opt"
                title="Bulk Content Generation"
              >
                <Sparkles className="w-5 h-5 text-indigo-400 group-hover/opt:scale-110 transition-transform" />
              </button>
            )}

            <button
              onClick={onSchedule}
              className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-center group/opt"
              title="Automation Settings"
            >
              <Calendar className="w-5 h-5 text-slate-400 group-hover/opt:text-white transition-colors" />
            </button>

            <button
              onClick={onExport}
              className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-center group/opt"
              title="Export Intelligence"
            >
              <Download className="w-5 h-5 text-slate-400 group-hover/opt:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
