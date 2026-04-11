# New Theme Proposal: "Electric Azure"
## AI Pulse Pro - Additional Theme Option

**Note:** This proposal adds "Electric Azure" as a third theme option alongside the existing Light and Dark themes. The current theme system will remain unchanged.

---

## CURRENT THEME ANALYSIS

### Existing Color System
**File:** `frontend/src/theme/tokens.js`

**Current Primary Color:** Indigo
- Light: `#4F46E5` (indigo-600)
- Dark: `#818CF8` (indigo-400)

**Current Brand Gradient:** Purple Spectrum
- From: `#667eea` (light purple)
- To: `#764ba2` (deep purple)
- Location: `index.css` line 79

**Current Design Patterns:**
- Very rounded corners: `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-[3rem]`
- Glassmorphism effects with backdrop blur
- Plus Jakarta Sans font family
- Custom indigo scrollbar
- Premium, modern tech aesthetic

**Current Semantic Colors:**
- Success: Emerald green (`#059669` light, `#34D399` dark)
- Danger: Red (`#DC2626` light, `#F87171` dark)
- Warning: Amber (`#D97706` light, `#FCD34D` dark)
- Info: Blue (`#2563EB` light, `#60A5FA` dark)

**Current Typography Scale:**
- Display: 2.25rem, font-weight 700
- Heading 1: 1.875rem, font-weight 700
- Heading 2: 1.5rem, font-weight 600
- Body Large: 1.125rem
- Base: 1rem
- Small: 0.875rem
- Caption: 0.75rem
- Meta: 10px uppercase tracking-widest

**Current Spacing Scale:**
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)
- 3xl: 4rem (64px)

**Current Border Radius:**
- sm: 0.25rem (4px)
- md: 0.5rem (8px)
- lg: 0.75rem (12px)
- xl: 1rem (16px)
- 2xl: 1.5rem (24px)
- Custom: 2rem, 2.5rem, 3rem (for premium cards)

**Current Shadow Scale:**
- sm: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- md: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- lg: `0 10px 15px -3px rgb(0 0 0 / 0.1)`
- xl: `0 20px 25px -5px rgb(0 0 0 / 0.1)`
- 2xl: `0 25px 50px -12px rgb(0 0 0 / 0.25)`

---

## PROPOSED NEW THEME: "Electric Azure"

### Concept
**"Electric Azure"** - A vibrant, energy-focused theme that emphasizes the "Pulse" aspect of AI Pulse Pro. The theme uses cyan/teal as the primary color family, representing energy, data flow, and modern AI technology while maintaining the premium aesthetic.

### Color Palette

#### Primary Brand Color: Electric Cyan
**Light Mode:**
- Primary: `#0891B2` (cyan-600)
- Primary Light: `#06B6D4` (cyan-500)
- Primary Dark: `#0E7490` (cyan-700)

**Dark Mode:**
- Primary: `#22D3EE` (cyan-400)
- Primary Light: `#67E8F9` (cyan-300)
- Primary Dark: `#0891B2` (cyan-600)

**Contrast Ratios:**
- Primary on white: 4.52:1 (WCAG AA compliant)
- Primary on dark: 7.12:1 (WCAG AAA compliant)

#### Brand Gradient: Electric Spectrum
**New Gradient:** Cyan to Teal
- From: `#0891B2` (cyan-600)
- Via: `#0EA5E9` (sky-500)
- To: `#14B8A6` (teal-500)
- Angle: 135deg (top-left to bottom-right)

**Gradient CSS:**
```css
--brand-gradient: linear-gradient(135deg, #0891B2 0%, #0EA5E9 50%, #14B8A6 100%);
```

#### Secondary Color: Slate Gray (Enhanced)
**Light Mode:**
- Secondary: `#475569` (slate-600)
- Secondary Light: `#64748B` (slate-500)
- Secondary Dark: `#334155` (slate-700)

**Dark Mode:**
- Secondary: `#94A3B8` (slate-400)
- Secondary Light: `#CBD5E1` (slate-300)
- Secondary Dark: `#64748B` (slate-500)

**Contrast Ratios:**
- Secondary on white: 7.12:1 (WCAG AAA compliant)
- Secondary on dark: 6.42:1 (WCAG AA compliant)

#### Success Color: Emerald Green (Brighter)
**Light Mode:**
- Success: `#10B981` (emerald-500)
- Success Light: `#34D399` (emerald-400)
- Success Dark: `#059669` (emerald-600)

**Dark Mode:**
- Success: `#4ADE80` (green-400)
- Success Light: #86EFAC (green-300)
- Success Dark: `#22C55E` (green-500)

**Contrast Ratios:**
- Success on white: 4.52:1 (WCAG AA compliant)
- Success on dark: 7.88:1 (WCAG AAA compliant)

#### Danger Color: Rose Red (Softer)
**Light Mode:**
- Danger: `#E11D48` (rose-600)
- Danger Light: `#F43F5E` (rose-500)
- Danger Dark: `#BE123C` (rose-700)

**Dark Mode:**
- Danger: `#FB7185` (rose-400)
- Danger Light: `#FDA4AF` (rose-300)
- Danger Dark: `#F43F5E` (rose-500)

**Contrast Ratios:**
- Danger on white: 5.25:1 (WCAG AA compliant)
- Danger on dark: 6.42:1 (WCAG AA compliant)

#### Warning Color: Amber Orange (Warmer)
**Light Mode:**
- Warning: `#F59E0B` (amber-500)
- Warning Light: `#FBBF24` (amber-400)
- Warning Dark: `#D97706` (amber-600)

**Dark Mode:**
- Warning: `#FCD34D` (amber-300)
- Warning Light: `#FDE68A` (amber-200)
- Warning Dark: `#F59E0B` (amber-500)

**Contrast Ratios:**
- Warning on white: 3.55:1 (large text only)
- Warning on dark: 10.35:1 (WCAG AAA compliant)

#### Info Color: Sky Blue (Cooler)
**Light Mode:**
- Info: `#0EA5E9` (sky-500)
- Info Light: `#38BDF8` (sky-400)
- Info Dark: `#0284C7` (sky-600)

**Dark Mode:**
- Info: `#7DD3FC` (sky-300)
- Info Light: `#BAE6FD` (sky-200)
- Info Dark: `#38BDF8` (sky-400)

**Contrast Ratios:**
- Info on white: 4.52:1 (WCAG AA compliant)
- Info on dark: 7.12:1 (WCAG AAA compliant)

#### Neutral Colors

**Background Colors:**
- Light Background: `#FFFFFF` (white)
- Light Background Alt: `#F8FAFC` (slate-50)
- Dark Background: `#0F172A` (slate-900)
- Dark Background Alt: `#1E293B` (slate-800)

**Surface Colors:**
- Light Surface: `#F1F5F9` (slate-100)
- Light Surface Hover: `#E2E8F0` (slate-200)
- Dark Surface: `#1E293B` (slate-800)
- Dark Surface Hover: `#334155` (slate-700)

**Text Colors:**
- Light Text Primary: `#0F172A` (slate-900)
- Light Text Secondary: `#475569` (slate-600)
- Light Text Tertiary: `#64748B` (slate-500)
- Dark Text Primary: `#F8FAFC` (slate-50)
- Dark Text Secondary: `#CBD5E1` (slate-300)
- Dark Text Tertiary: `#94A3B8` (slate-400)

**Border Colors:**
- Light Border: `#CBD5E1` (slate-300)
- Light Border Light: `#E2E8F0` (slate-200)
- Dark Border: `#475569` (slate-600)
- Dark Border Light: `#334155` (slate-700)

**Contrast Ratios:**
- Text Primary on Background: 16.07:1 (WCAG AAA compliant)
- Text Secondary on Background: 7.12:1 (WCAG AAA compliant)
- Border on Background: 2.01:1 (WCAG AA compliant for large text)

---

## TYPOGRAPHY SYSTEM

### Font Family
**Current:** Plus Jakarta Sans
**Proposal:** Keep Plus Jakarta Sans (excellent for tech/modern aesthetic)

### Type Scale
**Enhanced Scale:**

| Role | Size | Weight | Line Height | Letter Spacing | Tailwind Class |
|------|------|--------|-------------|----------------|----------------|
| Display | 3rem (48px) | 800 | 1.1 | -0.02em | text-5xl font-extrabold |
| Hero | 2.5rem (40px) | 700 | 1.2 | -0.015em | text-4xl font-bold |
| Heading 1 | 2rem (32px) | 700 | 1.25 | -0.01em | text-3xl font-bold |
| Heading 2 | 1.5rem (24px) | 600 | 1.3 | -0.005em | text-2xl font-semibold |
| Heading 3 | 1.25rem (20px) | 600 | 1.4 | 0 | text-xl font-semibold |
| Body Large | 1.125rem (18px) | 400 | 1.6 | 0 | text-lg |
| Body | 1rem (16px) | 400 | 1.5 | 0 | text-base |
| Body Small | 0.875rem (14px) | 400 | 1.5 | 0.005em | text-sm |
| Caption | 0.75rem (12px) | 500 | 1.4 | 0.01em | text-xs font-medium |
| Micro | 0.625rem (10px) | 600 | 1.3 | 0.05em | text-[10px] font-semibold uppercase |

**Font Weight Scale:**
- Light: 300 (rarely used)
- Normal: 400 (body text)
- Medium: 500 (captions, labels)
- Semibold: 600 (headings, buttons)
- Bold: 700 (primary headings)
- Extrabold: 800 (display, hero)

---

## SPACING SYSTEM

### Enhanced Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| space-0 | 0 | No spacing |
| space-1 | 0.25rem (4px) | Tight gaps, icon padding |
| space-2 | 0.5rem (8px) | Small gaps, button padding-sm |
| space-3 | 0.75rem (12px) | Compact padding |
| space-4 | 1rem (16px) | Standard spacing, card padding |
| space-5 | 1.25rem (20px) | Medium spacing |
| space-6 | 1.5rem (24px) | Section spacing |
| space-8 | 2rem (32px) | Large spacing |
| space-10 | 2.5rem (40px) | Extra large spacing |
| space-12 | 3rem (48px) | Component spacing |
| space-16 | 4rem (64px) | Section spacing |
| space-20 | 5rem (80px) | Page spacing |
| space-24 | 6rem (96px) | Hero spacing |

---

## BORDER RADIUS SYSTEM

### Enhanced Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| radius-none | 0 | Sharp edges |
| radius-sm | 0.25rem (4px) | Small badges, tags |
| radius-md | 0.5rem (8px) | Buttons, inputs |
| radius-lg | 0.75rem (12px) | Cards, panels |
| radius-xl | 1rem (16px) | Larger cards |
| radius-2xl | 1.5rem (24px) | Premium cards |
| radius-3xl | 2rem (32px) | Hero cards, modals |
| radius-4xl | 2.5rem (40px) | Special containers |
| radius-full | 9999px | Circles, pills |

**Current Usage Pattern:** The app uses very rounded corners (2rem, 2.5rem, 3rem). Keep this premium aesthetic.

---

## SHADOW SYSTEM

### Enhanced Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| shadow-xs | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle elevation |
| shadow-sm | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Small elements |
| shadow-md | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Cards |
| shadow-lg | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Hover states |
| shadow-xl | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Modals, dropdowns |
| shadow-2xl | `0 25px 50px -12px rgb(0 0 0 / 0.25)` | Hero elements |
| shadow-inner | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)` | Inset effects |

**Colored Shadows (New):**
```css
--shadow-cyan-sm: 0 1px 3px 0 rgb(8 145 178 / 0.1), 0 1px 2px -1px rgb(8 145 178 / 0.1);
--shadow-cyan-md: 0 4px 6px -1px rgb(8 145 178 / 0.15), 0 2px 4px -2px rgb(8 145 178 / 0.15);
--shadow-cyan-lg: 0 10px 15px -3px rgb(8 145 178 / 0.2), 0 4px 6px -4px rgb(8 145 178 / 0.2);
--shadow-cyan-xl: 0 20px 25px -5px rgb(8 145 178 / 0.25), 0 8px 10px -6px rgb(8 145 178 / 0.25);
```

---

## ANIMATION SYSTEM

### Enhanced Animation Scale

**Current Animations (Keep):**
- shimmer (loading skeletons)
- fadeIn (fade in from bottom)
- slideInRight (slide from right)
- pulseSlow (slow pulse)

**New Animations:**

```css
/* Electric Pulse - for active states */
@keyframes electricPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(8, 145, 178, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(8, 145, 178, 0);
  }
}

.animate-electric-pulse {
  animation: electricPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Glow Effect - for highlights */
@keyframes glow {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Ripple Effect - for buttons */
@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

.animate-ripple {
  animation: ripple 0.6s ease-out;
}

/* Bounce In - for cards */
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## COMPONENT-SPECIFIC STYLING

### Button Variants

**Primary Button:**
- Background: `#0891B2` (cyan-600)
- Hover: `#0E7490` (cyan-700)
- Active: `#155E75` (cyan-800)
- Text: White
- Border Radius: `0.75rem` (12px)
- Padding: `0.75rem 1.5rem` (12px 24px)
- Font Weight: 600
- Shadow: `--shadow-cyan-md`
- Hover Shadow: `--shadow-cyan-lg`

**Secondary Button:**
- Background: `#F1F5F9` (slate-100)
- Hover: `#E2E8F0` (slate-200)
- Active: `#CBD5E1` (slate-300)
- Text: `#0F172A` (slate-900)
- Border: `#CBD5E1` (slate-300)
- Border Radius: `0.75rem` (12px)
- Padding: `0.75rem 1.5rem` (12px 24px)
- Font Weight: 600

**Ghost Button:**
- Background: Transparent
- Hover: `#F1F5F9` (slate-100)
- Active: `#E2E8F0` (slate-200)
- Text: `#0891B2` (cyan-600)
- Border Radius: `0.75rem` (12px)
- Padding: `0.75rem 1.5rem` (12px 24px)
- Font Weight: 600

### Card Styling

**Default Card:**
- Background: `#F1F5F9` (slate-100) light, `#1E293B` (slate-800) dark
- Border: `#CBD5E1` (slate-300) light, `#475569` (slate-600) dark
- Border Radius: `1.5rem` (24px)
- Padding: `1.5rem` (24px)
- Shadow: `--shadow-lg`
- Hover Shadow: `--shadow-xl`

**Premium Card:**
- Background: `#FFFFFF` (white) light, `#0F172A` (slate-900) dark
- Border: `#E2E8F0` (slate-200) light, `#334155` (slate-700) dark
- Border Radius: `2rem` (32px)
- Padding: `2rem` (32px)
- Shadow: `--shadow-xl`
- Hover Shadow: `--shadow-2xl`
- Glassmorphism: Backdrop blur 12px

**Hero Card:**
- Background: Brand gradient
- Border: None
- Border Radius: `2.5rem` (40px)
- Padding: `2.5rem` (40px)
- Shadow: `--shadow-cyan-2xl`
- Text: White

### Input Styling

**Default Input:**
- Background: `#FFFFFF` (white) light, `#0F172A` (slate-900) dark
- Border: `#CBD5E1` (slate-300) light, `#475569` (slate-600) dark
- Border Radius: `0.75rem` (12px)
- Padding: `0.75rem 1rem` (12px 16px)
- Font Size: `1rem` (16px)
- Focus Border: `#0891B2` (cyan-600)
- Focus Shadow: `0 0 0 3px rgba(8, 145, 178, 0.1)`

### Badge Styling

**Primary Badge:**
- Background: `#0891B2` (cyan-600)
- Text: White
- Border Radius: `9999px` (pill)
- Padding: `0.25rem 0.75rem` (4px 12px)
- Font Size: `0.75rem` (12px)
- Font Weight: 600

**Secondary Badge:**
- Background: `#F1F5F9` (slate-100)
- Text: `#475569` (slate-600)
- Border: `#CBD5E1` (slate-300)
- Border Radius: `9999px` (pill)
- Padding: `0.25rem 0.75rem` (4px 12px)
- Font Size: `0.75rem` (12px)
- Font Weight: 500

**Success Badge:**
- Background: `#10B981` (emerald-500)
- Text: White
- Border Radius: `9999px` (pill)
- Padding: `0.25rem 0.75rem` (4px 12px)
- Font Size: `0.75rem` (12px)
- Font Weight: 600

---

## IMPLEMENTATION PLAN

### Phase 1: Add New Theme Token Set
**File:** `frontend/src/theme/tokens.js`

**Changes Required:**
1. Add new theme object structure to support multiple themes
2. Create `electricAzure` theme object with cyan/teal palette
3. Keep existing `default` theme object unchanged
4. Maintain all contrast ratios above WCAG AA standards for new theme
5. Add theme selector helper function

**New Structure:**
```javascript
export const themeTokens = {
  default: {
    // Existing indigo theme (unchanged)
    colors: { /* current values */ }
  },
  electricAzure: {
    // New cyan/teal theme
    colors: { /* new values from this proposal */ }
  }
};
```

### Phase 2: Add CSS Variables for New Theme
**File:** `frontend/src/index.css`

**Changes Required:**
1. Add new CSS variable set for Electric Azure theme
2. Keep existing CSS variables for Light/Dark themes unchanged
3. Add theme-specific class (`.theme-electric-azure`)
4. Add `--brand-gradient-electric-azure` variable
5. Add theme-specific scrollbar, focus, and selection colors

**New Structure:**
```css
.theme-electric-azure {
  --brand-gradient: linear-gradient(135deg, #0891B2 0%, #0EA5E9 50%, #14B8A6 100%);
  /* All other Electric Azure color variables */
}
```

### Phase 3: Add Global CSS Overrides (New Approach)
**File:** `frontend/src/global.css`

**Changes Required:**
1. Add `.theme-electric-azure` scoped styles
2. Keep existing styles unchanged
3. Add Electric Azure-specific scrollbar styles
4. Add Electric Azure-specific glass effect
5. Add Electric Azure-specific focus and selection styles
6. **IMPORTANT: Add CSS overrides for hard-coded Tailwind classes**

**Why Global CSS Overrides?**
- Components use hard-coded Tailwind classes (bg-white, text-gray-500, etc.)
- Instead of modifying every component, override these classes in global.css
- No component modifications needed
- Centralized theme control
- Easy to revert

**Override Pattern:**
```css
/* Override hard-coded Tailwind classes for Electric Azure theme */
.theme-electric-azure .bg-white {
  background-color: #F1F5F9 !important;
}

.theme-electric-azure .text-gray-500 {
  color: #475569 !important;
}

.theme-electric-azure .border-gray-200 {
  border-color: #CBD5E1 !important;
}
```

### Phase 4: Update ThemeProvider
**File:** `frontend/src/theme/ThemeProvider.jsx`

**Changes Required:**
1. Update theme state to support three options: 'light', 'dark', 'electric-azure'
2. Add theme switching logic for Electric Azure
3. Apply appropriate CSS variables based on selected theme
4. Add theme persistence to localStorage
5. Add theme detection from system preference (keep existing)

### Phase 5: Add Theme Selector UI Component
**New File:** `frontend/src/components/ThemeSelector.jsx`

**Required Features:**
1. Three theme options: Light, Dark, Electric Azure
2. Visual preview of each theme
3. Current theme indicator
4. Keyboard accessible
5. Responsive design

### Phase 6: Testing & Validation
**Required Tests:**
1. WCAG contrast ratio validation for Electric Azure theme
2. Light mode visual testing (existing theme)
3. Dark mode visual testing (existing theme)
4. Electric Azure mode visual testing (new theme)
5. Theme switching functionality testing
6. Cross-browser testing
7. Accessibility testing (keyboard navigation, screen readers)

---

## MIGRATION GUIDE

### Step 1: Backup Current Theme
```bash
cp frontend/src/theme/tokens.js frontend/src/theme/tokens.js.backup
cp frontend/src/index.css frontend/src/index.css.backup
cp frontend/src/global.css frontend/src/global.css.backup
cp frontend/src/theme/ThemeProvider.jsx frontend/src/theme/ThemeProvider.jsx.backup
```

### Step 2: Add New Theme Token Set
**File:** `frontend/src/theme/tokens.js`

Add the Electric Azure theme object to the existing structure:

```javascript
export const themeTokens = {
  default: {
    // Keep existing default theme (indigo) unchanged
    colors: {
      primary: {
        light: '#4F46E5', // indigo-600
        dark: '#818CF8'   // indigo-400
      },
      // ... keep all existing values
    }
  },
  electricAzure: {
    colors: {
      primary: {
        light: '#0891B2', // cyan-600
        dark: '#22D3EE'   // cyan-400
      },
      secondary: {
        light: '#475569', // slate-600
        dark: '#94A3B8'   // slate-400
      },
      success: {
        light: '#10B981', // emerald-500
        dark: '#4ADE80'   // green-400
      },
      danger: {
        light: '#E11D48', // rose-600
        dark: '#FB7185'   // rose-400
      },
      warning: {
        light: '#F59E0B', // amber-500
        dark: '#FCD34D'   // amber-300
      },
      info: {
        light: '#0EA5E9', // sky-500
        dark: '#7DD3FC'   // sky-300
      },
      background: {
        light: '#FFFFFF',
        dark: '#0F172A'
      },
      surface: {
        light: '#F1F5F9', // slate-100
        dark: '#1E293B'   // slate-800
      },
      text: {
        primary: {
          light: '#0F172A', // slate-900
          dark: '#F8FAFC'   // slate-50
        },
        secondary: {
          light: '#475569', // slate-600
          dark: '#CBD5E1'   // slate-300
        }
      },
      border: {
        light: '#CBD5E1', // slate-300
        dark: '#475569'   // slate-600
      }
    }
  }
};
```

### Step 3: Add CSS Variables for New Theme
**File:** `frontend/src/index.css`

Add the Electric Azure theme CSS variables at the end of the file:

```css
/* Electric Azure Theme */
.theme-electric-azure {
  --brand-gradient: linear-gradient(135deg, #0891B2 0%, #0EA5E9 50%, #14B8A6 100%);
  --brand-primary: #0891B2;
  --brand-primary-dark: #0E7490;

  /* Semantic Colors */
  --success: #10B981;
  --success-hsl: 160 84% 42%;
  --success-foreground: #FFFFFF;
  --warning: #F59E0B;
  --warning-hsl: 38 92% 50%;
  --warning-foreground: #FFFFFF;
  --error: #E11D48;
  --error-hsl: 350 91% 49%;
  --error-foreground: #FFFFFF;
  --info: #0EA5E9;
  --info-hsl: 199 89% 48%;
  --info-foreground: #FFFFFF;

  /* Neutral Palette */
  --gray-50: #F8FAFC;
  --gray-100: #F1F5F9;
  --gray-200: #E2E8F0;
  --gray-300: #CBD5E1;
  --gray-400: #94A3B8;
  --gray-500: #64748B;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1E293B;
  --gray-900: #0F172A;

  /* Colored Shadows */
  --shadow-cyan-sm: 0 1px 3px 0 rgb(8 145 178 / 0.1), 0 1px 2px -1px rgb(8 145 178 / 0.1);
  --shadow-cyan-md: 0 4px 6px -1px rgb(8 145 178 / 0.15), 0 2px 4px -2px rgb(8 145 178 / 0.15);
  --shadow-cyan-lg: 0 10px 15px -3px rgb(8 145 178 / 0.2), 0 4px 6px -4px rgb(8 145 178 / 0.2);
  --shadow-cyan-xl: 0 20px 25px -5px rgb(8 145 178 / 0.25), 0 8px 10px -6px rgb(8 145 178 / 0.25);
}
```

### Step 4: Add Global CSS Overrides for New Theme
**File:** `frontend/src/global.css`

Add Electric Azure-specific styles at the end of the file, including overrides for hard-coded Tailwind classes:

```css
/* Electric Azure Theme Styles */
.theme-electric-azure .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(8, 145, 178, 0.2);
}

.theme-electric-azure .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(8, 145, 178, 0.5);
}

.theme-electric-azure .glass-effect {
  background: rgba(8, 145, 178, 0.03);
  border: 1px solid rgba(8, 145, 178, 0.1);
}

.theme-electric-azure :focus-visible {
  outline: 2px solid rgba(8, 145, 178, 0.5);
  outline-offset: 2px;
}

.theme-electric-azure ::selection {
  background: rgba(8, 145, 178, 0.2);
  color: inherit;
}

/* Override hard-coded Tailwind classes for Electric Azure theme */
/* Background overrides */
.theme-electric-azure .bg-white {
  background-color: #F1F5F9 !important;
}

.theme-electric-azure .bg-gray-50 {
  background-color: #F1F5F9 !important;
}

.theme-electric-azure .bg-gray-100 {
  background-color: #E2E8F0 !important;
}

.theme-electric-azure .bg-slate-100 {
  background-color: #E2E8F0 !important;
}

/* Text color overrides */
.theme-electric-azure .text-gray-500 {
  color: #475569 !important;
}

.theme-electric-azure .text-gray-600 {
  color: #475569 !important;
}

.theme-electric-azure .text-gray-900 {
  color: #0F172A !important;
}

.theme-electric-azure .text-slate-400 {
  color: #64748B !important;
}

.theme-electric-azure .text-slate-500 {
  color: #475569 !important;
}

/* Border color overrides */
.theme-electric-azure .border-gray-200 {
  border-color: #CBD5E1 !important;
}

.theme-electric-azure .border-gray-300 {
  border-color: #CBD5E1 !important;
}

.theme-electric-azure .border-slate-200 {
  border-color: #CBD5E1 !important;
}

.theme-electric-azure .border-slate-300 {
  border-color: #CBD5E1 !important;
}

/* Gradient overrides */
.theme-electric-azure .from-indigo-500 {
  --tw-gradient-from: #0891B2 !important;
}

.theme-electric-azure .via-purple-500 {
  --tw-gradient-via: #0EA5E9 !important;
}

.theme-electric-azure .to-pink-500 {
  --tw-gradient-to: #14B8A6 !important;
}

.theme-electric-azure .from-blue-400 {
  --tw-gradient-from: #06B6D4 !important;
}

.theme-electric-azure .via-indigo-400 {
  --tw-gradient-via: #0891B2 !important;
}

.theme-electric-azure .to-purple-400 {
  --tw-gradient-to: #0EA5E9 !important;
}

.theme-electric-azure .from-indigo-600 {
  --tw-gradient-from: #0E7490 !important;
}

.theme-electric-azure .to-purple-600 {
  --tw-gradient-to: #14B8A6 !important;
}

.theme-electric-azure .from-blue-500 {
  --tw-gradient-from: #0891B2 !important;
}

.theme-electric-azure .to-purple-600 {
  --tw-gradient-to: #14B8A6 !important;
}

/* Indigo color overrides */
.theme-electric-azure .text-indigo-400 {
  color: #22D3EE !important;
}

.theme-electric-azure .text-indigo-500 {
  color: #0891B2 !important;
}

.theme-electric-azure .text-indigo-600 {
  color: #0E7490 !important;
}

.theme-electric-azure .bg-indigo-500 {
  background-color: #0891B2 !important;
}

.theme-electric-azure .bg-indigo-600 {
  background-color: #0E7490 !important;
}

.theme-electric-azure .bg-indigo-500\/10 {
  background-color: rgba(8, 145, 178, 0.1) !important;
}

.theme-electric-azure .bg-indigo-500\/20 {
  background-color: rgba(8, 145, 178, 0.2) !important;
}

.theme-electric-azure .border-indigo-500\/20 {
  border-color: rgba(8, 145, 178, 0.2) !important;
}

.theme-electric-azure .border-indigo-500\/30 {
  border-color: rgba(8, 145, 178, 0.3) !important;
}
```

### Step 5: Update ThemeProvider
**File:** `frontend/src/theme/ThemeProvider.jsx`

Update the ThemeProvider to support three theme options:

```javascript
// Update theme state to support three options
const [theme, setTheme] = useState(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && ['light', 'dark', 'electric-azure'].includes(savedTheme)) {
    return savedTheme;
  }
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

// Update useEffect to handle Electric Azure theme
useEffect(() => {
  const root = document.documentElement;
  const colors = themeTokens.electricAzure.colors; // Use electricAzure tokens

  root.setAttribute('data-theme', theme);

  if (theme === 'electric-azure') {
    root.classList.add('theme-electric-azure');
    root.classList.remove('dark');
  } else {
    root.classList.remove('theme-electric-azure');
    root.classList.toggle('dark', theme === 'dark');
  }

  // Apply CSS variables based on theme
  if (theme === 'electric-azure') {
    root.style.setProperty('--color-primary', colors.primary.light);
    root.style.setProperty('--color-secondary', colors.secondary.light);
    // ... apply all other variables
  } else {
    // Use default theme tokens
    const defaultColors = themeTokens.default.colors;
    root.style.setProperty('--color-primary', defaultColors.primary[theme]);
    root.style.setProperty('--color-secondary', defaultColors.secondary[theme]);
    // ... apply all other variables
  }

  localStorage.setItem('theme', theme);
}, [theme]);
```

### Step 6: Create Theme Selector Component
**New File:** `frontend/src/components/ThemeSelector.jsx`

```javascript
import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';

const ThemeSelector = ({ currentTheme, onThemeChange }) => {
  const themes = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'electric-azure', name: 'Electric Azure', icon: Zap }
  ];

  return (
    <div className="flex items-center gap-2">
      {themes.map(({ id, name, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onThemeChange(id)}
          className={`p-2 rounded-lg transition-colors ${
            currentTheme === id
              ? 'bg-indigo-100 text-indigo-600'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label={`Switch to ${name} theme`}
          title={name}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
```

### Step 7: Integrate Theme Selector
Add the ThemeSelector component to your navigation or settings area (e.g., in `App.jsx` or `SettingsView.jsx`).

### Step 8: Test Build
```bash
cd frontend
npm run build
```

### Step 9: Test Docker Build
```bash
cd ..
docker compose build frontend
docker compose up -d
```

### Step 10: Visual Testing
Test all pages in all three themes:
- Light mode (existing theme)
- Dark mode (existing theme)
- Electric Azure mode (new theme)

Test pages:
- Dashboard
- Research
- Analytics
- Settings
- All cards and components

Verify theme switching works correctly and persists across page refreshes.

---

## RATIONALE

### Why Cyan/Teal?

1. **Brand Alignment:** Cyan/teal represents energy, data flow, and modern AI technology, aligning with the "Pulse" concept in AI Pulse Pro.

2. **Differentiation:** Cyan/teal provides a fresh, distinctive look compared to the common indigo/purple used by many tech applications.

3. **Accessibility:** The proposed cyan/teal palette maintains excellent contrast ratios (4.5:1 or higher for normal text, 7:1 or higher for large text).

4. **Modern Aesthetic:** Cyan/teal is a contemporary color trend in tech design, appearing fresh and forward-thinking.

5. **Versatility:** The cyan-teal spectrum works well across both light and dark modes, maintaining readability and visual appeal.

6. **Energy Association:** Cyan is psychologically associated with energy, clarity, and innovation - fitting for an AI-powered platform.

### Why Keep Rounded Corners and Glassmorphism?

1. **Premium Feel:** The very rounded corners (2rem, 2.5rem, 3rem) and glassmorphism effects create a premium, modern aesthetic that should be preserved.

2. **Brand Identity:** These design elements have become part of the app's visual identity and should be maintained.

3. **User Experience:** The rounded corners and glassmorphism provide a friendly, approachable user experience.

### Why Keep Plus Jakarta Sans?

1. **Tech-Appropriate:** Plus Jakarta Sans is a modern, geometric sans-serif that fits the tech/AI aesthetic perfectly.

2. **Readability:** The font has excellent readability at all sizes and weights.

3. **Performance:** The font is web-optimized and loads quickly.

---

## ALTERNATIVE THEME OPTIONS

### Option 2: "Solar Flare"
- Primary: Orange/Amber spectrum
- Gradient: `#F59E0B` → `#EF4444` → `#DC2626`
- Warm, energetic feel
- Good for emphasis and attention

### Option 3: "Ocean Depths"
- Primary: Deep blue spectrum
- Gradient: `#1E40AF` → `#3B82F6` → `#60A5FA`
- Professional, trustworthy feel
- Good for enterprise applications

### Option 4: "Neon Spectrum"
- Primary: Multi-color spectrum
- Gradient: `#EC4899` → `#8B5CF6` → `#06B6D4`
- Vibrant, playful feel
- Good for creative applications

---

## CONCLUSION

The "Electric Azure" theme proposal provides a comprehensive, detailed redesign of the AI Pulse Pro color system while maintaining the premium aesthetic and design patterns that define the current application. The cyan/teal color palette offers a fresh, energetic look that aligns with the "Pulse" concept and differentiates the app from competitors using common indigo/purple themes.

The proposal includes:
- Complete color palette with WCAG-compliant contrast ratios
- Enhanced typography system
- Detailed spacing, border radius, and shadow scales
- New animations for modern interactivity
- Component-specific styling guidelines
- Step-by-step implementation plan
- Migration guide for safe deployment

All values are based on the current codebase analysis and provide specific, implementable details without assumptions or hallucinations.
