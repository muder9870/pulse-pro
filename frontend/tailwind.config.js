/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      fontSize: {
        base: ['14px', { lineHeight: '1.5' }],
      },
      colors: {
        // Pulse Pro palette — usable as Tailwind classes e.g. bg-pp-bg, text-pp-accent
        'pp-bg':       '#080B14',
        'pp-bg2':      '#0D1120',
        'pp-bg3':      '#111827',
        'pp-bg4':      '#1a2235',
        'pp-surface':  '#141C2E',
        'pp-surface2': '#1C2640',
        'pp-text':     '#F0F4FF',
        'pp-text2':    '#8A96B0',
        'pp-text3':    '#4A5568',
        'pp-accent':   '#6C63FF',
        'pp-accent2':  '#8B5CF6',
        'pp-teal':     '#00D4A8',
        'pp-amber':    '#F59E0B',
        'pp-red':      '#EF4444',
        'pp-green':    '#10B981',
        'pp-pink':     '#EC4899',
        // Tailwind shadcn compat
        border:     'hsl(var(--border-tw))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent-tw))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      borderRadius: {
        lg:  'var(--radius-lg)',
        md:  'var(--radius)',
        sm:  '6px',
        DEFAULT: 'var(--radius)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in':   'fadeIn 200ms ease',
        'slide-up':  'slideUp 250ms ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
        'shimmer':   'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
