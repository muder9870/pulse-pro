import React from 'react';
import PodcastViewComponent from '../components/PodcastView';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

const PodcastView = () => (
  <FeatureErrorBoundary name="Podcast">
    <PodcastViewComponent />
  </FeatureErrorBoundary>
);

export default PodcastView;
