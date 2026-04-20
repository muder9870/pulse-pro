# MASTER PLAN: Pulse Pro App Polish

This master plan outlines the steps required to align the current Pulse Pro application with the high-fidelity UI/UX design reference defined in `docs/pulse-pro.html`.

## 1. Visual & Layout Foundation
- [ ] **Aesthetic Alignment**: Update the global theme to strictly match the "Cyber-Industrial" dark palette (`#080B14`) and indigo/purple accents.
- [ ] **Glass-morphism**: Apply consistent backdrop-blur and border-transparency across all cards and containers.
- [ ] **Typography**: Ensure 'Syne' is used for displays/headers and 'DM Sans' for body text as per the reference.

## 2. Command Center (Dashboard) Enhancements
- [ ] **Onboarding Strip**: Implement the 5-step "Setup Guide" at the top of the dashboard.
- [ ] **Focus Banner**: Add the "Today's Focus" banner to highlight launch-ready articles.
- [ ] **KPI Cards**: Refine the Intelligence Base, AI Processed, Quality Index, and Content Ready cards with trend indicators (↑/↓).
- [ ] **Priority Picks**: Polish the "Top Scored" vertical list on the right side of the dashboard.

## 3. Sidebar & Header Polish
- [x] **Sidebar Refinement**: Organize the sidebar into "Main Menu" and "Source Folders" with color-coded source dots. (Task 11 Redesign)
- [x] **Source Manager**: Implemented icon tiles, grouped labels, and status badges for intelligence streams. (Task 11 Redesign)
- [ ] **Activity Feed**: Implement the notification panel (right sidebar) for system events (pipeline completion, podcast generation, etc.).

## 4. Production Feed (Articles) Improvements
- [ ] **Score-based Categorization**: Add visual indicators for High Score (Green), Mid Score (Amber), and Low Score (Gray) articles.
- [ ] **Filter Bar**: Ensure the score and source filters are highly responsive and match the reference styling.
- [ ] **Card Layout**: Refine the `StoryCard` to include the score chip, article meta, and primary action buttons (Deep Dive, Generate Post, arXiv link).

## 5. Technical Deep Dive Modal
- [ ] **Modal Implementation**: Create the comprehensive modal shown in the design for deep technical analysis.
- [ ] **Tabbed Content**: Implement the Overview, Methodology, Results, and Implications tabs.
- [ ] **Action Integration**: Allow users to trigger "Generate Post" directly from the deep dive view.

## 6. Automation & Maintenance
- [ ] **Docker Rebuild Rule**: Automatically rebuild relevant services (`frontend`, `backend`, or `full app`) after every completed task.
- [ ] **System Verification**: Use automated screenshot scripts to verify UI consistency after major changes.

---
**Reference**: [pulse-pro.html](file:///d:/Pulse%20Pro/docs/pulse-pro.html)
**Status**: Pending Approval
