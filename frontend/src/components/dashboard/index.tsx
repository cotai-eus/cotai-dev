import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy loaded components
const MetricCard = lazy(() => import('./MetricCard'));
const DashboardChart = lazy(() => import('./DashboardChart'));
const Recommendations = lazy(() => import('./Recommendations'));
const TimeFilter = lazy(() => import('./TimeFilter'));

// Loaders
const ComponentLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" p={2} minHeight={200}>
    <CircularProgress />
  </Box>
);

// Export lazy-loaded components with Suspense
export const LazyMetricCard = (props: React.ComponentProps<typeof MetricCard>) => (
  <Suspense fallback={<ComponentLoader />}>
    <MetricCard {...props} />
  </Suspense>
);

export const LazyDashboardChart = (props: React.ComponentProps<typeof DashboardChart>) => (
  <Suspense fallback={<ComponentLoader />}>
    <DashboardChart {...props} />
  </Suspense>
);

export const LazyRecommendations = (props: React.ComponentProps<typeof Recommendations>) => (
  <Suspense fallback={<ComponentLoader />}>
    <Recommendations {...props} />
  </Suspense>
);

export const LazyTimeFilter = (props: React.ComponentProps<typeof TimeFilter>) => (
  <Suspense fallback={<ComponentLoader />}>
    <TimeFilter {...props} />
  </Suspense>
);

// Also export the original components for direct use
export { MetricCard, DashboardChart, Recommendations, TimeFilter };
