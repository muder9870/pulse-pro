import React from 'react';
import MediaManager from '../components/MediaManager';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

const MediaView = () => (
  <FeatureErrorBoundary name="Media">
    <MediaManager />
  </FeatureErrorBoundary>
);

export default MediaView;
