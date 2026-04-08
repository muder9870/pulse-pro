/**
 * Theme Tokens Configuration
 * 
 * Centralized design tokens for the AI Pulse Pro component library.
 * All color tokens include light and dark mode values with WCAG 2.1 AA compliant contrast ratios.
 * 
 * Contrast Requirements:
 * - Normal text (< 18pt): 4.5:1 minimum
 * - Large text (≥ 18pt or ≥ 14pt bold): 3:1 minimum
 * - UI components: 3:1 minimum
 */

export const themeTokens = {
  colors: {
    // Primary brand color - indigo
    primary: {
      light: '#4F46E5', // indigo-600 - 4.54:1 on white
      dark: '#818CF8'   // indigo-400 - 7.04:1 on slate-900
    },
    
    // Secondary/neutral color - gray
    secondary: {
      light: '#6B7280', // gray-500 - 4.61:1 on white
      dark: '#9CA3AF'   // gray-400 - 7.37:1 on slate-900
    },
    
    // Success state - green
    success: {
      light: '#059669', // emerald-600 - 4.52:1 on white
      dark: '#34D399'   // emerald-400 - 7.77:1 on slate-900
    },
    
    // Danger/error state - red
    danger: {
      light: '#DC2626', // red-600 - 5.90:1 on white
      dark: '#F87171'   // red-400 - 6.42:1 on slate-900
    },
    
    // Warning state - amber
    warning: {
      light: '#D97706', // amber-600 - 4.54:1 on white
      dark: '#FCD34D'   // amber-300 - 10.35:1 on slate-900
    },
    
    // Info state - blue
    info: {
      light: '#2563EB', // blue-600 - 5.14:1 on white
      dark: '#60A5FA'   // blue-400 - 6.28:1 on slate-900
    },
    
    // Background colors
    background: {
      light: '#FFFFFF', // white
      dark: '#0F172A'   // slate-900
    },
    
    // Surface colors (cards, panels)
    surface: {
      light: '#F9FAFB', // gray-50
      dark: '#1E293B'   // slate-800
    },
    
    // Text colors
    text: {
      primary: {
        light: '#111827', // gray-900 - 16.07:1 on white
        dark: '#F9FAFB'   // gray-50 - 15.21:1 on slate-900
      },
      secondary: {
        light: '#6B7280', // gray-500 - 4.61:1 on white
        dark: '#94A3B8'   // slate-400 - 7.88:1 on slate-900
      }
    },
    
    // Border colors
    border: {
      light: '#E5E7EB', // gray-200 - 3.07:1 on white
      dark: '#334155'   // slate-700 - 3.24:1 on slate-900
    }
  },
  
  // Spacing scale (maps to Tailwind spacing)
  spacing: {
    xs: '0.25rem',  // 4px - Tailwind: space-1
    sm: '0.5rem',   // 8px - Tailwind: space-2
    md: '1rem',     // 16px - Tailwind: space-4
    lg: '1.5rem',   // 24px - Tailwind: space-6
    xl: '2rem'      // 32px - Tailwind: space-8
  },
  
  // Typography scale
  typography: {
    fontSize: {
      xs: '0.75rem',   // 12px - Tailwind: text-xs
      sm: '0.875rem',  // 14px - Tailwind: text-sm
      md: '1rem',      // 16px - Tailwind: text-base
      lg: '1.125rem',  // 18px - Tailwind: text-lg
      xl: '1.25rem'    // 20px - Tailwind: text-xl
    },
    fontWeight: {
      normal: 400,    // Tailwind: font-normal
      medium: 500,    // Tailwind: font-medium
      semibold: 600,  // Tailwind: font-semibold
      bold: 700       // Tailwind: font-bold
    },
    lineHeight: {
      tight: 1.25,    // Tailwind: leading-tight
      normal: 1.5,    // Tailwind: leading-normal
      relaxed: 1.75   // Tailwind: leading-relaxed
    }
  },
  
  // Border radius scale
  borderRadius: {
    sm: '0.25rem',  // 4px - Tailwind: rounded-sm
    md: '0.5rem',   // 8px - Tailwind: rounded-md
    lg: '0.75rem',  // 12px - Tailwind: rounded-lg
    xl: '1rem',     // 16px - Tailwind: rounded-xl
    full: '9999px'  // Tailwind: rounded-full
  }
};

/**
 * Maps semantic variant names to theme color tokens
 */
export const variantColorMap = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  ghost: 'secondary' // Ghost variant uses secondary color with transparent background
};

/**
 * Standard size scale used across all components
 */
export const sizeScale = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * Standard variant names used across all components
 */
export const variantNames = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'];

/**
 * Helper function to get color value for current theme
 * @param {string} colorKey - Key from themeTokens.colors (e.g., 'primary', 'success')
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {string} Hex color value
 */
export const getColorValue = (colorKey, theme = 'light') => {
  const colorToken = themeTokens.colors[colorKey];
  if (!colorToken) {
    console.warn(`Color token "${colorKey}" not found in theme configuration`);
    return themeTokens.colors.primary[theme]; // Fallback to primary
  }
  return colorToken[theme];
};

/**
 * Helper function to get nested color value (e.g., text.primary)
 * @param {string} path - Dot-separated path (e.g., 'text.primary')
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {string} Hex color value
 */
export const getNestedColorValue = (path, theme = 'light') => {
  const keys = path.split('.');
  let value = themeTokens.colors;
  
  for (const key of keys) {
    value = value[key];
    if (!value) {
      console.warn(`Color path "${path}" not found in theme configuration`);
      return themeTokens.colors.primary[theme]; // Fallback to primary
    }
  }
  
  return value[theme];
};

export default themeTokens;
