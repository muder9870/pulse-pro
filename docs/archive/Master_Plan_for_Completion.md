# Master Plan for Completion: AI Pulse Pro v2.1

This document outlines the final enhancement phases for AI Pulse Pro, incorporating refined strategies for analysis, generation, and user engagement.

## Current Project Baseline
- **LLM**: Groq (Llama 3.3 70B) for speed and cost-efficiency.
- **Pipeline**: Automated ingestion from arXiv, GitHub, Reddit, RSS, and Gmail.
- **Generation**: Manual trigger via Dashboard.
- **Platform support**: 14+ platforms including Twitter, LinkedIn, and Blog.

---

## 🧭 Refined Enhancement Roadmap

### 📦 Step 1: Phase 1 — Perfect (Ship Immediately)
*Focus: Peak human-like output and consistent CTR.*

1.  **Hook-First Generation Rule (Global)**:
    - **Always** start generation with `viral_hook`.
    - Then expand into the specific platform format.
    - Ensure `viral_hook` is not just stored in the DB but is the lead for all output.
2.  **Few-Shot Prompt Library & Normalization**:
    - Implement a library of 2–3 "best-in-class" examples per platform.
    - Add a **global instruction layer** (strong hooks, no generic phrases, concise/human-like).
3.  **Safe JSON Scaling**:
    - Add a robust `safe_parse_json` utility with repair and safe fallbacks.

### 🐛 Step 2: Fix Frontend Post Visibility
*Focus: Resolve the current bug preventing posts from being seen.*

### 🔍 Step 3: Phase 2 — Critical (Analysis & Structuring)
*Focus: Reliable, fast, and deduplicated intelligence.*

4.  **Structured Extraction Engine**:
    - Schema: `summary`, `viral_hook`, `key_innovation`, `implication`, `tags`.
    - Keep it lean (avoid 10+ fields) for speed and reliability.
5.  **Smart arXiv Chunking**:
    - Only chunk if `len(text) > 8000`.
    - Otherwise, perform single-pass analysis to save tokens and time.
6.  **Content Deduplication Intelligence**:
    - Compare embeddings of titles/summaries.
    - If similarity > 0.85, mark as duplicate cluster and process only one.

### 🎙️ Step 4: Engagement & Phase 3 (Specialized Content)
*Focus: Differentiation through unique formats and quality loops.*

7.  **Engagement Tracking**:
    - Implement basic tracking for user interactions with generated posts.
8.  **Podcast Dialogue Generator**:
    - Create a "Debate Mode" template (Expert vs. Skeptic) for conversations.
9.  **Conditional Self-Critique Loop**:
    - Use ONLY for `high_score` articles or long-form content.
    - Avoid wasting tokens on low-value articles.

### 🎨 Step 5: Phase 4 — Polish (Future Moat) [COMPLETED]
*Focus: UX enhancements and behavior-driven ranking.*

10. **Artistic Style Mapping**:
    - Dynamic image prompts based on category. [DONE]
11. **Visual & UX Polish (Premium Pass)**:
    - Standardized typography (Plus Jakarta Sans). [DONE]
    - Global Audio Context for background playback. [DONE]
    - Glassmorphism & premium redesign of Research/Intel Brief. [DONE]
12. **ML Relevance Ranking**:
    - Transition from rule-based scoring to behavior-driven ranking (future moat).
    - *Note: User Style Learning is delayed until more data is available.*

---

## 🛠️ Verification Strategy

### Automated Testing
- `pytest tests/test_generators.py` (Verify hook-first output and few-shot injection)
- `pytest tests/test_processors.py` (Verify structured extraction, conditional chunking, and dedup)

### Manual Verification
- Check frontend for post visibility (Fix for Step 2).
- Trigger pipeline and verify `viral_hook` leads the output in generated posts.
- Inspect DB for deduplication clusters.
- Run similarity checks on sample headlines to verify dedup logic.

