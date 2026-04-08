import React from 'react';
import EnhancedAnalytics from '../components/EnhancedAnalytics';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

const AnalyticsView = ({ onBack }) => (
  <FeatureErrorBoundary name="Analytics">
    <EnhancedAnalytics onBack={onBack} />
  </FeatureErrorBoundary>
);

export default AnalyticsView;
