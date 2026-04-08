# AI Pulse -- Intelligence Console Redesign Specification

## Vision

AI Pulse is not a feed reader.

AI Pulse is an AI-powered Signal Intelligence Console that transforms
raw information streams into structured, ranked, and draft-ready content
opportunities.

The system should: - Reduce noise - Surface high-value signals -
Pre-analyze every item - Enable one-click draft generation - Learn from
performance over time

AI handles 70%. Human handles 30%.

------------------------------------------------------------------------

# 1. Core Product Identity

## Current State

-   Feed-style content list
-   Tag chips
-   Multiple platform tabs
-   Manual action buttons

## Target State

Signal → Intelligence → Decision → Draft → Publish → Learn

The interface must reflect workflow, not aggregation.

------------------------------------------------------------------------

# 2. Primary System Flow

    Signal Intake (RSS, GitHub, Reddit, APIs)
        ↓
    AI Intelligence Layer
        ↓
    Human Review & Selection
        ↓
    AI Draft Engine
        ↓
    Content Library
        ↓
    Performance Feedback Loop

------------------------------------------------------------------------

# 3. UI Redesign Overview

## Replace Current Feed Layout With:

### A. Intelligence Card Layout

Each content item should display:

-   🔥 Trend Score (0--100)
-   🎯 Relevance Score (0--100)
-   🧠 AI Summary (2--3 lines)
-   💡 Suggested Angle (1 line)
-   🏷 Primary Tag (max 2 visible)
-   📊 Momentum Indicator
-   Status Badge
-   Primary Action Button: `Generate Draft`

Secondary metadata should be hidden behind expandable details.

------------------------------------------------------------------------

# 4. Card Structure Specification

## Card Fields

### Header

-   Title (Large, bold)
-   Source (subtle)
-   Timestamp

### Intelligence Section

-   Trend Score Badge (Color-coded)
-   Relevance Score Badge
-   AI 2--3 sentence summary
-   Suggested content angle

### Status Indicator

One of: - New - Reviewed - Drafted - Published - Archived

### Primary Action

Button: - Generate Draft

Secondary actions (dropdown): - Edit Tags - Archive - Mark Reviewed

------------------------------------------------------------------------

# 5. Navigation Redesign

## Remove Platform Tabs (for now)

Instead use:

-   🔥 Trending
-   🎯 High Relevance
-   🧠 AI Recommended
-   📂 Reviewed
-   🗄 Archive

Focus on signal prioritization, not distribution.

------------------------------------------------------------------------

# 6. Intelligence Layer (Critical Feature)

Every incoming signal must be processed by AI before display.

## Required AI Analysis

For each item, compute:

-   Trend Score (0--100)
-   Relevance Score (based on niche profile)
-   Summary
-   Suggested Angle
-   Content Type Recommendation:
    -   LinkedIn Post
    -   Blog Article
    -   Thread
    -   Technical Breakdown

------------------------------------------------------------------------

# 7. Focus Mode (Detail View)

When user clicks an item:

Split screen layout:

Left: - Intelligence card list

Right: - Full AI analysis panel

Detail Panel Includes: - Full summary - Why this matters - Angle
suggestions - Draft outline - One-click full draft generation

------------------------------------------------------------------------

# 8. Workflow States

Each item must have lifecycle tracking:

-   New
-   Reviewed
-   Drafted
-   Published
-   Archived

Filter and group by state.

This converts system from reader → production engine.

------------------------------------------------------------------------

# 9. Draft Engine Integration

When user clicks "Generate Draft":

System should: - Use AI to create structured article - Save draft to
Draft Library - Link draft to original signal - Change status to Drafted

------------------------------------------------------------------------

# 10. Performance Feedback (Phase 3)

Future capability:

-   Track which drafts get published
-   Store engagement metrics
-   Adjust scoring algorithm
-   Reinforce high-performing patterns

System evolves into self-learning content intelligence engine.

------------------------------------------------------------------------

# 11. UX Guidelines

-   Use clean card layout
-   Reduce tag clutter
-   Use white space generously
-   Color-code scores
-   Highlight primary action clearly
-   Minimize secondary controls
-   Avoid visual noise

------------------------------------------------------------------------

# 12. Technical Considerations

-   Scoring logic should be modular
-   AI analysis must be asynchronous
-   Prevent duplicate draft generation
-   Cache AI summaries
-   Track token usage

------------------------------------------------------------------------

# 13. MVP Scope (Strict)

MVP includes: - Signal ingestion - AI scoring - Intelligence cards -
Generate Draft button - Workflow status tracking

Exclude: - Multi-platform publishing - Analytics dashboards - User
accounts - SaaS billing

Focus = Signal → Draft engine.

------------------------------------------------------------------------

# 14. Long-Term Evolution

AI Pulse can evolve into:

-   Backend engine for MuseForge
-   Standalone SaaS
-   Signal intelligence tool for AI researchers
-   Automated content strategy engine

------------------------------------------------------------------------

# 15. Strategic Positioning

AI Pulse is not: - Feedly - Notion - A tag manager

AI Pulse is: An AI Signal Intelligence Engine.
