# Master Plan for Completion: AI Pulse Pro v2.1

This document outlines the final enhancement phases for AI Pulse Pro, incorporating refined strategies for analysis, generation, and user engagement.

## Current Project Baseline
- **LLM**: Groq (Llama 3.3 70B) for speed and cost-efficiency.
- **Pipeline**: Automated ingestion from arXiv, GitHub, Reddit, RSS, and Gmail.
- **Generation**: Manual trigger via Dashboard.
- **Platform support**: 14+ platforms including Twitter, LinkedIn, and Blog.

---

## 🧭 Refined Enhancement Roadmap

### [x] Phase 1: Quality Multipliers (DONE)
*Focus: Maximum impact with minimal complexity.*

1.  **[x] Few-Shot Prompt Library**:
    - [x] Implement a structured library of "best-in-class" examples for each platform.
    - [x] Inject these examples into `ContentGenerator` to guide LLM tone and format.
2.  **[x] Source-Specific Prompting**:
    - [x] Tailor analysis and generation prompts based on origin (e.g., технике focused for arXiv, practical for GitHub, engagement-hook for Reddit).
3.  **[x] Enhanced Scoring Hooks**:
    - [x] Improve `ArticleScorer` to identify "viral hooks" during ingestion.

### [x] Phase 2: Analysis Depth (DONE)
*Focus: Better information extraction and research quality.*

4.  **[x] Structured Analysis Engine**:
    - [x] Replace Chain-of-Thought (CoT) with structured extraction (Key Innovation, Benchmarks, Implication, Hooks) to save tokens and reduce latency.
5.  **[x] arXiv Semantic Chunking (Map-Reduce)**:
    - [x] Implement a chunking strategy for long PDFs to ensure benchmarks and conclusions are captured, not just the abstract.

### [x] Phase 3: Engagement Engineering (DONE)
*Focus: Specialized content formats and self-improvement.*

6.  **[x] Self-Critique Generation Loop**:
    - [x] Implement a single-prompt self-critique (Self-Correction) to improve clarity and platform tone without doubling LLM calls.
7.  **[x] Podcast Dialogue Generator**:
    - [x] Create a "Debate Mode" template (Expert vs. Skeptic) for highly engaging audio/text content.

### [x] Phase 4: UX & Personalization (DONE)
*Focus: Polish and long-term value.*

8.  **[x] Artistic Style Mapping**:
    - [x] Dynamic image prompts based on category (Industrial for Robotics, Futuristic for LLMs).
9.  **[x] User Style Learning (Style Profile)**:
    - [x] Integrate historical user edits into prompts to mimic the user's specific writing voice.
10. **[x] ML Relevance Ranking**:
    - [x] Develop a simple ranking model based on user engagement metrics (clicks/shares) to self-improve story selection.

---

## 🛠️ Verification Strategy

### Automated Testing
- `pytest tests/test_generators.py` (Verify few-shot injection and source prompts)
- `pytest tests/test_processors.py` (Verify structured extraction and arXiv chunking)

### Manual Verification
- Trigger pipeline from settings and inspect "Intelligence Feed" for improved summaries.
- Generate posts and verify consistency with "Few-shot" examples.
- Inspect DB `processed_articles` for structured metrics.
