# Pulse Pro UI Redesign — Requirements

## Goal
Transform the existing frontend to match the `docs/pulse-pro.html` reference design exactly.
The reference is a complete, self-contained HTML mockup that defines the target look and feel.

## Core Design Principles (from reference)
- Deep dark backgrounds: `#080B14` → `#0D1120` → `#141C2E` (layered depth)
- Accent: `#6C63FF` (purple) with `#8B5CF6` secondary
- Teal: `#00D4A8`, Amber: `#F59E0B`, Green: `#10B981`, Red: `#EF4444`
- Fonts: `Syne` (display/headings) + `DM Sans` (body) + `DM Mono` (numbers/code)
- Sidebar: 220px fixed, compact nav items with left-bar active indicator
- Header: 54px, pill-style CTAs, animated status dot
- Cards: `#141C2E` surface, `rgba(255,255,255,0.07)` borders, 14px radius
- Scrollbar: 4px thin, transparent track

## Pages to Restyle (in order)
1. Global (tokens, fonts, layout shell)
2. Sidebar
3. Header (top bar)
4. Dashboard
5. Articles
6. Metrics/Analytics
7. Calendar
8. Media
9. Research
10. Podcast
11. Settings

## Rules
- One page at a time
- Build + Docker check after each page
- Git commit after each page passes review
- No functional changes — styling only
