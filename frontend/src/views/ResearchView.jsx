import React from 'react';
import ResearchViewComponent from '../components/ResearchView';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

const ResearchView = () => (
  <FeatureErrorBoundary name="Research">
    <ResearchViewComponent />
  </FeatureErrorBoundary>
);

export default ResearchView;
