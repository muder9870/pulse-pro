import React, { useState } from 'react';
import { User } from 'lucide-react';

/**
 * Avatar Component - Design System
 * 
 * Displays user avatars with fallback support.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Fallback order: image → initials → icon
 * 
 * Sizes:
 * - xs: 24px
 * - sm: 32px
 * - md: 40px (default)
 * - lg: 48px
 * - xl: 64px
 * 
 * Variants:
 * - circle: Circular avatar (default)
 * - square: Square avatar with rounded corners
 */
const Avatar = React.memo(({
  src,
  alt = '',
  initials,
  icon: CustomIcon,
  size = 'md',
  variant = 'circle',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const variants = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  const sizeClass = sizes[size] || sizes.md;
  const iconSizeClass = iconSizes[size] || iconSizes.md;
  const variantClass = variants[variant] || variants.circle;

  const Icon = CustomIcon || User;

  // Render image if available and not errored
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setImageError(true)}
        className={`${sizeClass} ${variantClass} object-cover bg-[var(--color-surface)] ${className}`}
        role="img"
      />
    );
  }

  // Render initials if provided
  if (initials) {
    return (
      <div
        className={`${sizeClass} ${variantClass} bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold ${className}`}
        role="img"
        aria-label={alt || initials}
      >
        {initials.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  // Render icon as final fallback
  return (
    <div
      className={`${sizeClass} ${variantClass} bg-[var(--color-surface)] text-[var(--color-text-secondary)] flex items-center justify-center ${className}`}
      role="img"
      aria-label={alt || 'User avatar'}
    >
      <Icon className={iconSizeClass} />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
