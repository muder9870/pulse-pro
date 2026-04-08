import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

/**
 * Enhanced Analytics Dashboard Component
 * 
 * Provides comprehensive analytics visualization:
 * - Story performance metrics
 * - User engagement analytics
 * - Platform distribution
 * - Trend analysis
 * - Real-time data updates
 * - Interactive charts and filters
 */

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Story Performance Chart
const StoryPerformanceChart = ({ data = [], timeRange = '7d' }) => {
  const [selectedMetric, setSelectedMetric] = useState('engagement');
  
  const metrics = useMemo(() => ({
    engagement: { label: 'Engagement Score', color: '#3B82F6' },
    views: { label: 'Total Views', color: '#10B981' },
    shares: { label: 'Shares', color: '#F59E0B' },
    conversions: { label: 'Conversions', color: '#EF4444' }
  }), []);

  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      ...metrics,
      engagement: item.engagement || 0,
      views: item.views || 0,
      shares: item.shares || 0,
      conversions: item.conversions || 0
    }));
  }, [data, metrics]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Story Performance</h3>
        <div className="flex items-center space-x-2">
          {Object.entries(metrics).map(([key, metric]) => (
            <Button
              key={key}
              variant={selectedMetric === key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric(key)}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} role="img" aria-label={`Story performance chart showing ${selectedMetric} over time`}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={selectedMetric}
            stroke={metrics[selectedMetric].color}
            strokeWidth={2}
            dot={{ fill: metrics[selectedMetric].color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// Platform Distribution Chart
const PlatformDistributionChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    return data.map(platform => ({
      name: platform.name,
      value: platform.count,
      percentage: platform.percentage
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {data.value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Platform Distribution</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.map((platform, index) => (
          <div key={platform.name} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-gray-600">{platform.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// User Engagement Metrics
const UserEngagementMetrics = ({ data = {} }) => {
  const metrics = useMemo(() => [
    {
      label: 'Total Users',
      value: data.totalUsers || 0,
      change: data.userChange || 0,
      format: 'number'
    },
    {
      label: 'Active Sessions',
      value: data.activeSessions || 0,
      change: data.sessionChange || 0,
      format: 'number'
    },
    {
      label: 'Avg. Session Duration',
      value: data.avgSessionDuration || 0,
      change: data.durationChange || 0,
      format: 'duration'
    },
    {
      label: 'Bounce Rate',
      value: data.bounceRate || 0,
      change: data.bounceChange || 0,
      format: 'percentage'
    }
  ], [data]);

  const formatValue = (value, format) => {
    switch (format) {
      case 'number':
        return value.toLocaleString();
      case 'duration':
        return `${Math.floor(value / 60)}m ${value % 60}s`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">{metric.label}</h4>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {formatValue(metric.value, metric.format)}
            </span>
            <Badge 
              variant={metric.change >= 0 ? 'success' : 'danger'}
              className="text-xs"
            >
              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Trend Analysis
const TrendAnalysis = ({ data = [] }) => {
  const [selectedTrend, setSelectedTrend] = useState('growth');
  
  const trends = useMemo(() => ({
    growth: { label: 'Growth Rate', color: '#10B981' },
    retention: { label: 'Retention Rate', color: '#3B82F6' },
    churn: { label: 'Churn Rate', color: '#EF4444' }
  }), []);

  const chartData = useMemo(() => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en', { month: 'short' }),
      ...trends,
      growth: item.growth || 0,
      retention: item.retention || 0,
      churn: item.churn || 0
    }));
  }, [data, trends]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Trend Analysis</h3>
        <div className="flex items-center space-x-2">
          {Object.entries(trends).map(([key, trend]) => (
            <Button
              key={key}
              variant={selectedTrend === key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedTrend(key)}
            >
              {trend.label}
            </Button>
          ))}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={selectedTrend}
            stroke={trends[selectedTrend].color}
            fill={trends[selectedTrend].color}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

// Real-time Activity Feed
const RealTimeActivityFeed = ({ activities = [] }) => {
  const [feed, setFeed] = useState(activities);
  const feedRef = useRef();

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      const newActivity = {
        id: Date.now(),
        type: ['story_created', 'story_updated', 'user_login', 'platform_post'][Math.floor(Math.random() * 4)],
        message: 'New activity occurred',
        timestamp: new Date(),
        user: 'System'
      };
      
      setFeed(prev => [newActivity, ...prev].slice(0, 10));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'story_created': return '📝';
      case 'story_updated': return '✏️';
      case 'user_login': return '👤';
      case 'platform_post': return '📤';
      default: return '📊';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Real-time Activity</h3>
      
      <div ref={feedRef} className="space-y-3 max-h-64 overflow-y-auto">
        {feed.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-lg">{getActivityIcon(activity.type)}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.message}</p>
              <p className="text-xs text-gray-500">
                {activity.user} • {activity.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Main Analytics Dashboard
const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock data - in real app, this would come from API
  const [analyticsData, setAnalyticsData] = useState({
    storyPerformance: [],
    platformDistribution: [],
    userEngagement: {},
    trendAnalysis: [],
    activities: []
  });

  useEffect(() => {
    // Simulate data loading
    const loadAnalytics = async () => {
      setIsLoading(true);
      
      // Mock API call
      setTimeout(() => {
        setAnalyticsData({
          storyPerformance: [
            { date: '2024-01-01', engagement: 85, views: 1200, shares: 45, conversions: 12 },
            { date: '2024-01-02', engagement: 92, views: 1500, shares: 52, conversions: 18 },
            { date: '2024-01-03', engagement: 78, views: 1100, shares: 38, conversions: 10 },
            { date: '2024-01-04', engagement: 95, views: 1800, shares: 65, conversions: 22 },
            { date: '2024-01-05', engagement: 88, views: 1400, shares: 48, conversions: 15 },
            { date: '2024-01-06', engagement: 91, views: 1600, shares: 58, conversions: 19 },
            { date: '2024-01-07', engagement: 86, views: 1300, shares: 44, conversions: 14 }
          ],
          platformDistribution: [
            { name: 'Twitter', count: 450, percentage: 35.7 },
            { name: 'LinkedIn', count: 320, percentage: 25.4 },
            { name: 'Facebook', count: 280, percentage: 22.2 },
            { name: 'Instagram', count: 210, percentage: 16.7 }
          ],
          userEngagement: {
            totalUsers: 15420,
            userChange: 12.5,
            activeSessions: 3420,
            sessionChange: 8.3,
            avgSessionDuration: 245,
            durationChange: -2.1,
            bounceRate: 32.4,
            bounceChange: -5.2
          },
          trendAnalysis: [
            { month: '2023-08', growth: 12.5, retention: 85.2, churn: 3.8 },
            { month: '2023-09', growth: 15.3, retention: 87.1, churn: 3.2 },
            { month: '2023-10', growth: 18.7, retention: 88.4, churn: 2.9 },
            { month: '2023-11', growth: 14.2, retention: 86.8, churn: 3.5 },
            { month: '2023-12', growth: 20.1, retention: 89.2, churn: 2.6 },
            { month: '2024-01', growth: 22.8, retention: 90.1, churn: 2.4 }
          ],
          activities: [
            { id: 1, type: 'story_created', message: 'New story "AI Trends 2024" created', timestamp: new Date(Date.now() - 1000 * 60 * 5), user: 'John Doe' },
            { id: 2, type: 'platform_post', message: 'Story posted to Twitter', timestamp: new Date(Date.now() - 1000 * 60 * 15), user: 'Jane Smith' },
            { id: 3, type: 'user_login', message: 'User logged in', timestamp: new Date(Date.now() - 1000 * 60 * 30), user: 'Mike Johnson' }
          ]
        });
        setIsLoading(false);
      }, 1000);
    };

    loadAnalytics();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? 'Last 24 Hours' : 
               range === '7d' ? 'Last 7 Days' :
               range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* User Engagement Metrics */}
      <UserEngagementMetrics data={analyticsData.userEngagement} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StoryPerformanceChart data={analyticsData.storyPerformance} timeRange={timeRange} />
        <PlatformDistributionChart data={analyticsData.platformDistribution} />
      </div>

      {/* Trend Analysis */}
      <TrendAnalysis data={analyticsData.trendAnalysis} />

      {/* Real-time Activity */}
      <RealTimeActivityFeed activities={analyticsData.activities} />
    </div>
  );
};

export default AnalyticsDashboard;
