import React from 'react';

/**
 * Skeleton Component - Design System
 * 
 * Loading placeholder that mimics content shape
 * 
 * @param {Object} props
 * @param {string} props.variant - 'text' | 'circular' | 'rectangular' | 'rounded'
 * @param {string} props.width - Width (css value or number for px)
 * @param {string} props.height - Height (css value or number for px)
 * @param {boolean} props.animate - Enable pulse animation
 * @param {string} props.className - Additional classes
 */
const Skeleton = ({
  variant = 'text',
  width,
  height,
  animate = true,
  className = '',
}) => {
  const baseStyles = 'bg-gray-200 dark:bg-slate-700';
  const animateStyles = animate ? 'animate-pulse' : '';

  const variantStyles = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animateStyles} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * SkeletonCard - Pre-built card skeleton layout
 */
export const SkeletonCard = ({ lines = 3, className = '' }) => (
  <div className={`p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" />
        <Skeleton width="40%" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '80%' : '100%'} />
      ))}
    </div>
  </div>
);

/**
 * SkeletonStats - Stats card skeleton for DashboardStats
 */
export const SkeletonStats = ({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-7 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <Skeleton variant="circular" width={48} height={48} />
          <Skeleton width={60} />
        </div>
        <Skeleton height={40} className="mb-1" />
        <Skeleton width="50%" />
      </div>
    ))}
  </div>
);

export default Skeleton;
