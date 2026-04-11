import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, FileText, Sparkles, Target, Calendar,
  ArrowLeft, Activity, BarChart2, Shield, Zap, Info, AlertTriangle
} from 'lucide-react';

export default function EnhancedAnalytics({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [scoreData, setScoreData] = useState([]);
  const [dataEstimates, setDataEstimates] = useState({
    timeline: false,
    scores: false
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }
      const data = await res.json();

      setStats({
        total: data.total_articles || 0,
        analyzed: data.processed_articles || 0,
        avgScore: Math.round(data.avg_viral_score || 0),
        withContent: Object.values(data.content_generation?.by_platform || {}).reduce((a, b) => a + b, 0)
      });

      // Process source data
      const sourceMap = data.articles?.by_source || {};
      const sourceChartData = Object.entries(sourceMap)
        .filter(([name, _]) => name !== null && name !== undefined)
        .map(([name, value]) => ({ name: String(name) || 'Unknown', value: Number(value) || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      setSourceData(sourceChartData);

      // Process timeline data - track if estimated
      const hasRealTimeline = data.daily_distribution && data.daily_distribution.length > 0;
      if (hasRealTimeline) {
        setTimelineData(data.daily_distribution);
        setDataEstimates(prev => ({ ...prev, timeline: false }));
      } else {
        // Fallback to heuristic if backend doesn't provide it
        const last7d = data.recent_activity?.last_7d || 0;
        const last24h = data.recent_activity?.last_24h || 0;
        const avgRestOfWeek = Math.round((last7d - last24h) / 6) || 0;
        
        const timelineChartData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const count = i === 0 ? last24h : avgRestOfWeek;
          const analyzedRatio = data.total_articles ? (data.processed_articles / data.total_articles) : 0;
          timelineChartData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            articles: count,
            analyzed: Math.round(count * analyzedRatio)
          });
        }
        setTimelineData(timelineChartData);
        setDataEstimates(prev => ({ ...prev, timeline: true }));
      }

      // Process score distribution - track if estimated
      const hasRealScores = data.score_distribution && data.score_distribution.length > 0;
      if (hasRealScores) {
        setScoreData(data.score_distribution);
        setDataEstimates(prev => ({ ...prev, scores: false }));
      } else {
        // Fallback - mark as estimated
        const totalProcessed = data.processed_articles || 0;
        const scoreChartData = [
          { range: '90-100', count: Math.round(totalProcessed * 0.15), label: 'Excellent' },
          { range: '70-89', count: Math.round(totalProcessed * 0.45), label: 'Good' },
          { range: '50-69', count: Math.round(totalProcessed * 0.25), label: 'Average' },
          { range: '0-49', count: Math.round(totalProcessed * 0.15), label: 'Low' }
        ];
        setScoreData(scoreChartData);
        setDataEstimates(prev => ({ ...prev, scores: true }));
      }

    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError(`Could not load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#10b981', '#64748b'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <p className="text-xs font-bold text-white">
                <span className="text-slate-400 capitalize">{entry.name}:</span> {entry.value}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in py-8">
        <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse border border-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-[2rem] animate-pulse border border-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[400px] bg-white/5 rounded-[2rem] animate-pulse border border-white/5" />
          <div className="h-[400px] bg-white/5 rounded-[2rem] animate-pulse border border-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in py-8">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-black text-red-300">{error}</span>
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="mt-3 text-sm font-black text-red-400 hover:text-red-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {onBack && (
            <button
              onClick={onBack}
              className="group flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-1">Intelligence Analytics</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Real-time Perspective Metrics</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchAnalyticsData} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all">
            Recalibrate Metrics
          </button>
        </div>
      </div>

      {/* High-Level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Intelligence Base', value: stats?.total, icon: FileText, color: 'indigo', status: 'Live Feed' },
          { label: 'AI Processed', value: stats?.analyzed, icon: Sparkles, color: 'purple', status: `${Math.round((stats?.analyzed / stats?.total) * 100 || 0)}% Coverage` },
          { label: 'Quality Index', value: `${stats?.avgScore}%`, icon: Target, color: 'emerald', status: 'High Accuracy' },
          { label: 'Content Ready', value: stats?.withContent, icon: Activity, color: 'orange', status: 'Generation Ready' }
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-7 shadow-xl hover:bg-slate-900/60 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors" />
            <div className="flex items-center justify-between mb-6 relative">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className={`w-6 h-6 text-white`} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-500">
                {item.status}
              </span>
            </div>
            <div className="text-4xl font-black text-white mb-1 tracking-tight relative">
              {item.value || 0}
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] relative">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline Chart */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <TrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Vibrancy Timeline
                  {dataEstimates.timeline && (
                    <span className="text-xs text-orange-400 ml-2 font-bold">[ESTIMATED]</span>
                  )}
                </h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Daily Article Throughput</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">Last 7 Days</div>
          </div>

          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAnalyzed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="articles"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorArticles)"
                  name="Total"
                />
                <Area
                  type="monotone"
                  dataKey="analyzed"
                  stroke="#a855f7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAnalyzed)"
                  name="AI Analyzed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Stream Diversity</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Intelligence Distribution</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">Top 6 Sources</div>
          </div>

          <div className="h-[300px] w-full relative min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-2xl font-black text-white">{stats?.total || 0}</div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Zap className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Quality Spectrum
                {dataEstimates.scores && (
                  <span className="text-sm text-orange-400 ml-2 font-bold">[ESTIMATED]</span>
                )}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Impact score distribution across database</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Optimized Scoring Active</span>
          </div>
        </div>

        <div className="h-[350px] w-full min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={350}>
            <BarChart data={scoreData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.2)"
                fontSize={11}
                fontWeight={800}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                fontSize={11}
                fontWeight={800}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar
                dataKey="count"
                radius={[12, 12, 4, 4]}
                name="Article Count"
              >
                {scoreData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#10b981' : index === 1 ? '#6366f1' : index === 2 ? '#f97316' : '#ef4444'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
