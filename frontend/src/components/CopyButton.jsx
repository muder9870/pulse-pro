import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Button from './ui/Button';

/**
 * CopyButton Component
 * 
 * Button to copy text to clipboard with visual feedback.
 * Includes aria-live region for accessibility.
 */
export default function CopyButton({ text, onCopy, size = 'xs', variant = 'secondary' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        onClick={handleCopy}
        variant={variant}
        size={size}
        icon={copied ? Check : Copy}
        title="Copy to clipboard"
        aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
      {/* aria-live region for screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copied ? 'Text copied to clipboard' : ''}
      </span>
    </>
  );
}

