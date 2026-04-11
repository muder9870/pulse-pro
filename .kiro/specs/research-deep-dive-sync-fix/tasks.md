# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE any fixes)
  - **Property 1: Bug Condition** - Analytics Import Crash, Missing Stat, and ID Mismatch
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate each bug on unfixed code
  - Create `backend/tests/test_research_deep_dive_sync.py`
  - **Bug 3 exploration**: Attempt `from backend.db.repositories.analytics_repository import AnalyticsRepository` inside a try/except and assert that an `ImportError` is raised (or that `EngagementMetric` cannot be resolved from `backend.models`)
  - **Bug 1 exploration**: Using a SQLite in-memory session, seed one `PaperAnalysis` row, call `AnalyticsRepository.get_dashboard_stats()`, assert `"deep_dive_analyzed"` is present and equals 1 — expect FAILURE because the key is absent on unfixed code
  - **Bug 4 exploration**: Using a SQLite in-memory session, create `RawArticle(id=10)`, `ProcessedArticle(id=99, raw_article_id=10)`, and a second `ProcessedArticle(id=10, raw_article_id=55)` — call `repo.ensure_processed_id(10)` and assert the returned `processed_id` traces back to `raw_article_id == 10`; on unfixed code the fallback path may return `ProcessedArticle.id=10` (belonging to `raw_article_id=55`), demonstrating the mismatch
  - Run tests: `pytest backend/tests/test_research_deep_dive_sync.py -k "exploration" -v`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `ImportError: cannot import name 'EngagementMetric' from 'backend.models'`, `deep_dive_analyzed` key absent, wrong `processed_id` returned)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 4.2_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Existing Stats Fields and Non-Deep-Dive Stories Unaffected
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior for non-buggy inputs
  - **Observe on unfixed code** (using in-memory DB with no `PaperAnalysis` rows):
    - `get_dashboard_stats()` returns `total_articles`, `processed_articles`, `generated_content`, `avg_priority_score`, `coverage_percentage`, `daily_distribution`, `score_distribution` with correct values
    - `_format_story()` on an article with no `PaperAnalysis` row returns `has_deep_analysis = False`
    - `POST /api/research/deep-dive` with a correctly-mapped `article_id` (where `ensure_processed_id` returns a `ProcessedArticle` whose `raw_article_id == article_id`) calls `analyze_complex_paper` with the correct `processed_id`
  - Write property-based tests using `hypothesis` (or parametrized pytest) capturing these observed behaviors:
    - For any count of `RawArticle`/`ProcessedArticle`/`GeneratedContent` rows (0–50), all existing stats keys are present and numerically correct
    - For any article without a `PaperAnalysis` row, `_format_story()["has_deep_analysis"]` is `False`
    - For a valid ID chain (`ProcessedArticle.raw_article_id == article_id`), the deep-dive route does NOT return 422
  - Run tests: `pytest backend/tests/test_research_deep_dive_sync.py -k "preservation" -v`
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix Bug 3 — Correct import path in `analytics_repository.py` (prerequisite)

  - [x] 3.1 Replace wrong import in `analytics_repository.py`
    - In `backend/db/repositories/analytics_repository.py` line 4, replace:
      `from backend.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent`
      with:
      `from backend.db.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent, PaperAnalysis`
    - Note: `PaperAnalysis` is added here because it is required for Bug 1 fix in task 4
    - _Bug_Condition: `"backend.models"` used as import source; `EngagementMetric` does not exist there_
    - _Expected_Behavior: module loads without `ImportError`; `AnalyticsRepository` is instantiable_
    - _Preservation: all existing `AnalyticsRepository` methods continue to function_
    - _Requirements: 2.5, 2.6_

  - [x] 3.2 Verify `analytics_repository.py` imports cleanly
    - Run: `python -c "from backend.db.repositories.analytics_repository import AnalyticsRepository; print('OK')"`
    - Confirm no `ImportError` is raised

- [ ] 4. Fix Bug 1 — Add `deep_dive_analyzed` count to `get_dashboard_stats()`

  - [x] 4.1 Add `PaperAnalysis` count query in `get_dashboard_stats()`
    - In `backend/db/repositories/analytics_repository.py`, inside `get_dashboard_stats()`, after the `generated_content` query line, add:
      `deep_dive_analyzed = self.session.query(func.count(PaperAnalysis.article_id)).scalar() or 0`
    - In the `return` dict, add `"deep_dive_analyzed": deep_dive_analyzed` immediately after `"generated_content": generated_content`
    - _Bug_Condition: `"deep_dive_analyzed" NOT IN stats_response` when `COUNT(PaperAnalysis) > 0`_
    - _Expected_Behavior: `stats["deep_dive_analyzed"] == COUNT(PaperAnalysis.article_id)` for all DB states_
    - _Preservation: all other keys in the return dict (`total_articles`, `processed_articles`, `generated_content`, `avg_priority_score`, etc.) remain unchanged_
    - _Requirements: 2.1, 2.2_

- [ ] 5. Fix Bug 2 — Correct import path in `article_repository.py`

  - [x] 5.1 Replace wrong import in `article_repository.py`
    - In `backend/db/repositories/article_repository.py` line 4, replace:
      `from backend.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis`
      with:
      `from backend.db.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis`
    - Verify `_format_story()` logic is already correct: it queries `PaperAnalysis.article_id == article.id` and sets `has_deep_analysis = bool(paper_analysis)` — no further changes needed
    - _Bug_Condition: `"has_deep_analysis" NOT IN story_dict` or `has_deep_analysis = False` when `PaperAnalysis` exists for `processed_article.id`_
    - _Expected_Behavior: `_format_story()["has_deep_analysis"] == True` iff `PaperAnalysis` row exists for that `ProcessedArticle.id`_
    - _Preservation: stories without `PaperAnalysis` continue to return `has_deep_analysis = False`_
    - _Requirements: 2.3, 2.4_

- [ ] 6. Fix Bug 4 — Add ID integrity check in deep-dive route

  - [x] 6.1 Add post-resolution integrity check in `research_deep_dive()`
    - In `backend/api/routes/research.py`, inside `research_deep_dive()`, after the `if not p_id: return 404` block, add:
      ```python
      # Bug 4 fix: verify resolved processed_id belongs to the requested article_id
      processed = db.query(ProcessedArticle).filter(ProcessedArticle.id == p_id).first()
      if processed and processed.raw_article_id != article_id:
          logger.error(
              f"deep_dive_id_mismatch article_id={article_id} "
              f"resolved_processed_id={p_id} "
              f"actual_raw_article_id={processed.raw_article_id}"
          )
          return jsonify({
              "error": "ID mismatch: resolved processed article does not belong to the requested raw article",
              "article_id": article_id,
              "resolved_processed_id": p_id,
              "actual_raw_article_id": processed.raw_article_id,
          }), 422
      ```
    - Ensure `ProcessedArticle` is already imported at the top of `research.py` (it is — from `backend.db.models`)
    - _Bug_Condition: `ProcessedArticle.WHERE(id=p_id).raw_article_id != article_id`_
    - _Expected_Behavior: HTTP 422 returned with descriptive error; `analyze_complex_paper` is NOT called_
    - _Preservation: valid ID chain (`raw_article_id == article_id`) continues to trigger analysis normally_
    - _Requirements: 2.7, 2.8_

- [ ] 7. Verify bug condition exploration tests now pass

  - [x] 7.1 Re-run exploration tests on fixed code
    - **Property 1: Expected Behavior** - Analytics Import Resolves, Stat Present, Mismatch Returns 422
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Run: `pytest backend/tests/test_research_deep_dive_sync.py -k "exploration" -v`
    - **EXPECTED OUTCOME**: All exploration tests PASS (confirms all four bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

  - [x] 7.2 Re-run preservation tests on fixed code
    - **Property 2: Preservation** - Existing Stats Fields and Non-Deep-Dive Stories Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `pytest backend/tests/test_research_deep_dive_sync.py -k "preservation" -v`
    - **EXPECTED OUTCOME**: All preservation tests still PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Run the full test file: `pytest backend/tests/test_research_deep_dive_sync.py -v`
  - Confirm all exploration and preservation tests pass
  - Optionally run the broader backend test suite to check for unintended regressions
  - Ask the user if any questions arise before closing the spec

- [x] 9. Add Regenerate endpoint — force re-run deep dive and overwrite cached analysis
  - Add `DELETE /api/research/analysis/<int:article_id>` route in `backend/api/routes/research.py`
    - Delete the existing `PaperAnalysis` row for the given article (looked up via `ProcessedArticle.raw_article_id == article_id`)
    - Return `{"status": "cleared", "article_id": article_id}` with 200
    - Return 404 if no `PaperAnalysis` exists for this article
  - This allows the frontend to clear the cache and then re-POST to `/api/research/deep-dive` to regenerate
  - _Requirements: analysis quality — user must be able to force a fresh LLM run when results are poor_

- [x] 10. Add Regenerate, Copy, and Download buttons to `PaperDetailsModal.jsx`

  - [x] 10.1 Add Regenerate button
    - In `PaperDetailsModal`, accept a new `onRegenerate` prop (async function, called when user clicks Regenerate)
    - Add a `regenerating` boolean state (default `false`) — set to `true` while regeneration is in progress
    - In the modal footer (next to the existing "Close Deep Dive" button), add a "Regenerate" button:
      - Icon: `RefreshCw` from lucide-react (spin animation when `regenerating === true`)
      - Label: "Regenerate" (or "Regenerating…" while in progress)
      - Disabled while `regenerating === true` or while `!analysis` (still loading initial result)
      - On click: call `onRegenerate()` — the parent (`ResearchView`) handles the DELETE + re-POST flow
    - Style: secondary/outline style, left of the Close button

  - [x] 10.2 Add Copy to Clipboard button
    - Add a "Copy" button in the modal footer (between Regenerate and Close)
    - Icon: `Copy` from lucide-react; switches to `Check` for 2 seconds after successful copy
    - On click: build a plain-text string from the current `analysis` object:
      ```
      # {story.title}

      ## Technical Methodology
      {analysis.methodology}

      ## Experimental Results
      {analysis.results}

      ## Critical Limitations
      {analysis.limitations}

      ## Authors
      {analysis.authors.join(', ')}

      ## Affiliations
      {analysis.affiliations}
      ```
    - Use `navigator.clipboard.writeText(text)` — show a brief "Copied!" tooltip or icon swap on success
    - Disabled when `!analysis`

  - [x] 10.3 Add Download as Markdown button
    - Add a "Download" button in the modal footer (between Copy and Close)
    - Icon: `Download` from lucide-react
    - On click: generate the same plain-text Markdown string as Copy (task 10.2), create a `Blob` with `type: 'text/markdown'`, create an object URL, trigger an `<a>` download with filename `deep-dive-{story.id}.md`, then revoke the URL
    - Disabled when `!analysis`

  - [x] 10.4 Wire `onRegenerate` in `ResearchView` (the component at `frontend/src/components/ResearchView.jsx`)
    - Add a `handleRegenerate` async function:
      1. Set `deepDiving(true)` and clear `analysis` (set to `null`) so the loading skeleton shows
      2. Call `DELETE /api/research/analysis/{selectedPaper.id}` to clear the cached result
      3. Call `POST /api/research/deep-dive` with `{ article_id: selectedPaper.id }` to re-run
      4. On success: set `analysis` to the new result
      5. On error: show an `alert` with the error message
      6. Always: set `deepDiving(false)`
    - Pass `handleRegenerate` as the `onRegenerate` prop to `<PaperDetailsModal>`

- [x] 11. Checkpoint — Full verification
  - Run `pytest backend/tests/test_research_deep_dive_sync.py -v` — all tests must pass
  - Manually verify in the browser: open a paper's Deep Dive modal and confirm Regenerate, Copy, and Download buttons are present and functional
  - Confirm Regenerate clears the old analysis, shows the loading skeleton, and populates fresh results
  - Confirm Copy produces correct Markdown in the clipboard
  - Confirm Download saves a `.md` file with the correct filename and content
