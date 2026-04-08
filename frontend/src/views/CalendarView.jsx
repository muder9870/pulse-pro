import React from 'react';
import ContentCalendar from '../components/ContentCalendar';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

const CalendarView = () => (
  <FeatureErrorBoundary name="Calendar">
    <ContentCalendar />
  </FeatureErrorBoundary>
);

export default CalendarView;
