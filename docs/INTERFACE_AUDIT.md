# Pulse Pro — Interface & Functional Audit

This document summarizes the findings from a detailed audit of the Pulse Pro interface, fonts, and core functionalities.

## 1. Sidebar & Navigation
| Area | Finding | Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **Source Truncation** | Labels like `rss:Simon Willison...` are cut off at 100px. | ❌ Ugly | Increase `max-w` to 140px and add tooltip on hover. |
| **Quick Links** | Functional, but take up 30% of vertical space. | ⚠️ Cluttered | Move into a "Settings" dropdown or a separate "System" section at the bottom. |
| **Indicators** | "Coming Soon" icons for Media, Research, Podcast are missing. | ❌ Missing | Add Clock/Badge indicators as per Task 5.9. |
| **Hierarchy** | No visible dividers between sections. | ❌ Flat | Add `border-t border-border/50` between nav groups. |

## 2. Typography & Fonts
| Area | Finding | Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **Global Font** | `index.css` imports 'Plus Jakarta Sans' but `body` uses 'Inter'. | ❌ Inconsistent | Standardize on **Plus Jakarta Sans** for that premium look. |
| **Type Scale** | Inconsistent usage of `text-[10px]` vs `text-xs`. | ⚠️ Ad-hoc | Migrate to the defined type scale in `index.css`. |

## 3. Global Daily Intel Brief
| Area | Finding | Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **Action Button** | "Explore Deep Dive" is `py-4` (Huge) with `text-[10px]` (Tiny). | ❌ Disproportionate | Reduce padding to `py-2.5`, increase font to `text-xs`. |
| **Visual Weight** | Cards have high contrast `bg-white/[0.03]` but heavy borders. | ⚠️ Heavy | Soften borders and use the `glass-morphism` utility. |

## 4. Multi-Platform Content Generation
| Area | Finding | Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **Post Lengths** | `generator_v5.py` has a 300-token limit for Instagram, but a 2200-char limit in templates. | ❌ Inconsistent | Sync LLM `max_tokens` with platform `char_limit` to ensure "correct" post lengths. |
| **Hashtags** | Sometimes missing or incorrectly formatted in the UI. | ⚠️ Unreliable | Ensure `StoryCard.jsx` always fetches hashtags after generation. |

## 5. Settings Hub
| Area | Finding | Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **Tab Sync** | Sidebar links to `/monetization` work, but SettingsHub state isn't always synced. | ⚠️ Buggy | Ensure `SettingsView` reads the route path to set the active tab. |

---
**Audit Performed:** April 10, 2026
**Status:** Ready for Refinement phase.
