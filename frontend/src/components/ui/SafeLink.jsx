import React from 'react';

/**
 * SafeLink Component
 * 
 * Automatically adds security attributes to external links:
 * - rel="noopener noreferrer" (prevents tabnabbing, improves performance)
 * - target="_blank" (opens in new tab)
 * 
 * For internal links, behaves like a normal anchor tag.
 * 
 * Usage:
 * <SafeLink href="https://example.com">External Link</SafeLink>
 * <SafeLink href="/dashboard" internal>Internal Link</SafeLink>
 */
const SafeLink = ({
  href,
  children,
  internal = false,
  className = '',
  ...props
}) => {
  const isExternal = !internal && (
    href?.startsWith('http') || 
    href?.startsWith('//') ||
    href?.startsWith('mailto:') ||
    href?.startsWith('tel:')
  );

  const externalProps = isExternal ? {
    target: '_blank',
    rel: 'noopener noreferrer',
  } : {};

  return (
    <a
      href={href}
      className={className}
      {...externalProps}
      {...props}
    >
      {children}
    </a>
  );
};

export default SafeLink;
