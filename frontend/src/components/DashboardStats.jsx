import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, Badge } from './ui';
import { SkeletonStats } from './ui/Skeleton';
import FeatureErrorBoundary from './FeatureErrorBoundary';

const DashboardStats = React.memo(({ activeTheme }) => {
  const [stats, setStats] = useState({
    totalArticles: 0,
    processedArticles: 0,
    generatedContent: 0,
    avgQualityScore: 0,
    deepDiveAnalyzed: 0,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalArticles: data.total_articles || 0,
          processedArticles: data.processed_articles || 0,
          generatedContent: data.generated_content || 0,
          avgQualityScore: data.avg_priority_score || 0,
          deepDiveAnalyzed: data.deep_dive_analyzed || 0,
          loading: false
        });
      } else {
        await fetchStatsIndividually();
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
      await fetchStatsIndividually();
    }
  };

  const fetchStatsIndividually = async () => {
    try {
      const storiesRes = await fetch('/api/stories?limit=all');
      const stories = await storiesRes.json();

      const totalArticles = Array.isArray(stories) ? stories.length : 0;
      const processedArticles = Array.isArray(stories)
        ? stories.filter(s => s.summary).length
        : 0;
      const deepDiveAnalyzed = Array.isArray(stories)
        ? stories.filter(s => s.has_deep_analysis).length
        : 0;

      setStats({
        totalArticles,
        processedArticles,
        generatedContent: processedArticles * 3, // Estimate
        avgQualityScore: 0,
        deepDiveAnalyzed,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch individual stats', err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return <SkeletonStats count={4} className="mb-12" />;
  }

  if (stats.error) {
    return (
      <div className="mb-12 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load dashboard stats</span>
        </div>
        <button 
          onClick={fetchStats}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const items = [
    { label: 'Intelligence Base', value: stats.totalArticles, icon: FileText, color: 'indigo', status: 'Active', filter: 'all' },
    { label: 'AI Analyzed', value: stats.processedArticles, icon: Sparkles, color: 'purple', status: `${Math.round((stats.processedArticles / stats.totalArticles) * 100 || 0)}%`, filter: 'analyzed' },
    { label: 'Posts Generated', value: stats.generatedContent, icon: CheckCircle, color: 'emerald', status: 'Ready', filter: 'hasContent' },
    { label: 'Deep Dive Explorer', value: stats.deepDiveAnalyzed, icon: TrendingUp, color: 'orange', status: 'Actionable', filter: 'deepDive' }
  ];

  const handleCardClick = (item) => {
    window.dispatchEvent(new CustomEvent('dashboard-filter', { 
      detail: { filter: item.filter } 
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in">
      {items.map((item, idx) => (
        <Card 
          key={idx} 
          onClick={() => handleCardClick(item)}
          className="dark:bg-slate-900/40 bg-white backdrop-blur-xl dark:border-white/10 border-slate-200 shadow-xl dark:hover:bg-slate-900/60 hover:bg-slate-50 transition-all duration-300 group cursor-pointer active:scale-95"
        >
          <Card.Content className="p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className={`w-6 h-6 ${activeTheme === 'dark' ? 'text-white' : `text-${item.color}-600`}`} />
              </div>
              <Badge variant="secondary" className="text-[9px] uppercase tracking-widest">
                {item.status}
              </Badge>
            </div>
            <div className="text-4xl font-black dark:text-white text-slate-900 mb-1 tracking-tight">
              {item.value}
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.label}</div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
});

const DashboardStatsWrapped = (props) => (
  <FeatureErrorBoundary name="DashboardStats">
    <DashboardStats {...props} />
  </FeatureErrorBoundary>
);

export default DashboardStatsWrapped;
