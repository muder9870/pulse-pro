import React from 'react';

/**
 * SkipLink Component
 * 
 * Provides keyboard-only skip navigation to main content.
 * Essential for WCAG 2.1 compliance (2.4.1 Bypass Blocks).
 * 
 * Usage:
 * <SkipLink targetId="main-content" />
 * <main id="main-content">...</main>
 */
const SkipLink = ({ targetId = 'main-content', children = 'Skip to main content' }) => {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
      // Move tabindex to allow focus
      if (target.tabIndex === -1) {
        target.tabIndex = -1;
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export default SkipLink;
