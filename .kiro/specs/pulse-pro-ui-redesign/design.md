# Pulse Pro UI Redesign — Design

## Reference
`docs/pulse-pro.html` — single-file HTML mockup with all CSS variables, components, and page layouts.

## CSS Variable Mapping (reference → Tailwind/CSS)

### Backgrounds
| Reference var | Value | Usage |
|---|---|---|
| `--bg` | `#080B14` | Body / outermost bg |
| `--bg2` | `#0D1120` | Sidebar, header |
| `--bg3` | `#111827` | Card inner sections |
| `--bg4` | `#1a2235` | Hover states |
| `--surface` | `#141C2E` | Cards |
| `--surface2` | `#1C2640` | Input bg, badges |

### Colors
| Reference var | Value |
|---|---|
| `--accent` | `#6C63FF` |
| `--accent2` | `#8B5CF6` |
| `--accent-glow` | `rgba(108,99,255,0.25)` |
| `--teal` | `#00D4A8` |
| `--amber` | `#F59E0B` |
| `--green` | `#10B981` |
| `--red` | `#EF4444` |
| `--pink` | `#EC4899` |
| `--text` | `#F0F4FF` |
| `--text2` | `#8A96B0` |
| `--text3` | `#4A5568` |

### Typography
- Display/headings: `Syne` (400–800)
- Body: `DM Sans` (300–500)
- Mono: `DM Mono` (400–500)
- Base font size: 14px

### Layout
- Sidebar width: 220px
- Header height: 54px
- Border radius: 10px (sm), 14px (lg)
- Content padding: 24px

## Component Patterns

### Sidebar
- Fixed left, full height, `--bg2` background
- Logo: gradient icon (accent→accent2) + "Pulse Pro" in Syne + "AI Decision Engine" label
- Nav items: 7px/10px padding, 8px radius, active = accent-glow bg + left 3px accent bar
- Source folders: 5px dot + name + count (right-aligned, mono font)
- Bottom: user card with avatar gradient

### Header
- 54px height, `--bg2` bg, border-bottom
- Left: search input (220px) + "Ready to Launch" pill (accent) + "Fetch" pill (teal)
- Right: calendar icon btn + export icon btn + notifications icon btn (red badge) + "Ready" status badge (green pulse dot)

### Cards
- `--surface` bg, `--border` (rgba white 7%) border, 14px radius
- Hover: border brightens to `--border2` (rgba white 12%)

### Article Cards
- Left border 3px: green (high score), amber (mid), gray (low)
- Checkbox + content + score chip (right)
- Actions: Deep Dive (primary), Generate Post, arXiv link

### KPI Cards
- Label: 10px uppercase mono, `--text3`
- Value: 28px Syne bold
- Trend: green (up) / red (down)

### Intel Cards (Dashboard)
- Score badge: amber bg, amber text
- Title: 14px Syne
- Body: 11px DM Sans
- Angle quote: italic, accent left border
- Footer: badge + "Deep Dive" button

### Notification Panel
- Slides in from right, 300px wide
- Fixed, top = header height, full remaining height

### Deep Dive Modal
- Max 680px, 80vh, tabbed nav
- Sections with teal/amber/pink section titles
