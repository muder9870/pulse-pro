# Pulse Pro UI Redesign — Tasks

## Rules
- Complete one task at a time
- After each task: build Docker, user reviews, then git commit
- Styling only — no functional changes

---

- [x] 1. Global Foundation — Tokens, Fonts, Layout Shell
  - [x] 1.1 Add Syne + DM Sans + DM Mono fonts to index.html and index.css
  - [x] 1.2 Replace CSS variables in index.css with Pulse Pro color tokens (--bg, --bg2, --surface, --accent, etc.)
  - [x] 1.3 Update body background and base font to match reference (14px base, DM Sans)
  - [x] 1.4 Update App.jsx outer wrapper: dark bg (#080B14), remove light mode slate-50 default
  - [x] 1.5 Update thin scrollbar styles (4px, transparent track)
  - [x] 1.6 Update tailwind.config.js to extend with Pulse Pro color palette and font families

- [x] 2. Sidebar Redesign
  - [x] 2.1 Shrink sidebar width from 256px (w-64) to 220px to match reference
  - [x] 2.2 Update sidebar background to --bg2 (#0D1120) and border to --border
  - [x] 2.3 Restyle logo section: gradient icon (accent→accent2), Syne font for "Pulse Pro", accent-colored subtitle
  - [x] 2.4 Restyle nav items: compact padding (7px/10px), 8px radius, active state = accent-glow bg + 3px left accent bar
  - [x] 2.5 Restyle source folders: 5px colored dot, name, right-aligned count in mono font
  - [x] 2.6 Restyle sidebar bottom user card: gradient avatar, Syne name, version in text3

- [x] 3. Header (Top Bar) Redesign
  - [x] 3.1 Set header height to 54px, background --bg2, border-bottom --border
  - [x] 3.2 Restyle search input: --surface bg, --border border, 8px radius, 220px width, accent focus
  - [x] 3.3 Add "Ready to Launch" pill (accent-glow bg, accent border/text) with article count
  - [x] 3.4 Add "Fetch" pill (teal-dim bg, teal border/text)
  - [x] 3.5 Restyle right-side icon buttons: 32px square, --surface bg, --border border, 8px radius
  - [x] 3.6 Add animated "Ready" status badge with green pulse dot

- [x] 4. Dashboard Page Redesign
  - [x] 4.1 Restyle page header: Syne font title, subtitle in text2, action buttons
  - [x] 4.2 Add onboarding progress strip (gradient bg, step circles)
  - [x] 4.3 Add focus banner (left accent border, today's action CTA)
  - [x] 4.4 Restyle KPI cards: Syne value font (28px), uppercase label, trend indicators
  - [x] 4.5 Restyle intel cards: score badge (amber), Syne title, italic angle quote with accent left border
  - [x] 4.6 Restyle priority picks sidebar: compact article rows with source + score
  - [x] 4.7 Restyle quick access grid: icon tiles with bg3 background

- [x] 5. Articles Page Redesign
  - [x] 5.1 Restyle page header and score filter tabs (All/High/Mid/Low with color coding)
  - [x] 5.2 Restyle article cards: 3px colored left border by score tier, checkbox, score chip
  - [x] 5.3 Restyle article action buttons: Deep Dive (primary), Generate Post, arXiv link
  - [x] 5.4 Restyle bulk actions bar: sticky bottom, accent border, action buttons

- [x] 6. Metrics/Analytics Page Redesign
  - [x] 6.1 Restyle KPI row (same as dashboard KPIs)
  - [x] 6.2 Restyle vibrancy timeline chart card
  - [x] 6.3 Restyle stream diversity donut chart card
  - [x] 6.4 Restyle quality spectrum bar chart
  - [x] 6.5 Restyle stat cards (LLM stats, throughput, DB pool)

- [x] 7. Calendar Page Redesign
  - [x] 7.1 Restyle calendar grid: today = accent bg, has-event = teal dot, other-month = text3
  - [x] 7.2 Restyle upcoming events panel: mono date labels, card-sm style

- [x] 8. Media Page Redesign
  - [x] 8.1 Restyle empty state: icon container, title, subtitle, step guide cards

- [x] 9. Research Page Redesign
  - [x] 9.1 Restyle filter tabs (category badges)
  - [x] 9.2 Restyle research cards: score chip, title, desc, action buttons

- [x] 10. Podcast Page Redesign
  - [x] 10.1 Restyle podcast hero card: gradient bg, microphone icon, description
  - [x] 10.2 Restyle audio player: play button (accent circle), progress bar, waveform animation
  - [x] 10.3 Restyle episode archive list: mono dates, title, duration, play button

- [x] 11. Settings Page Redesign
  - [x] 11.1 Restyle settings nav (left panel): grouped labels, icon tiles, active state
  - [x] 11.2 Restyle source manager panel: source rows with status badges
  - [x] 11.3 Restyle style profile panel: selectable option cards
  - [x] 11.4 Restyle keyword scoring panel: chips with score multipliers
  - [x] 11.5 Restyle webhooks panel: webhook rows with status
  - [x] 11.6 Restyle system health panel: KPI mini-cards + feature flag toggles
  - [x] 11.7 Restyle LLM providers panel: provider rows with check/x indicators
  - [x] 11.8 Restyle interface settings panel: toggle rows

- [x] 12. Notification Panel + Deep Dive Modal
  - [x] 12.1 Add slide-in notification panel (right side, activity feed)
  - [x] 12.2 Restyle deep dive modal: tabbed nav, sectioned content, teal/amber/pink section titles
