# Implementation Plan: Pipeline / Content Decoupling

## Overview

Decouple the monolithic pipeline into an automated analysis-only pipeline and a user-triggered content
generation flow. Adds keyword-based relevance scoring with a database-backed keyword list and a
Settings UI for managing keywords.

Backend-first order: DB model → repository → API → orchestrator → scorer.
Frontend second: StoryCard → KeywordsManager → SettingsView.
Tests last. Docker rebuild + clean state run at the end.

---

## Tasks

- [x] 0. Pre-implementation rules
  - Clear app data: `POST /api/system/reset-data` with header `X-Reset-Confirm: yes`
  - **Rules that apply to ALL tasks below:**
    1. DO NOT break existing working features (Research Deep Dive, Settings Hub, Podcast, Media, Analytics)
    2. DO NOT delete any file without first verifying it has zero active imports
    3. DO NOT change any DB schema without adding a migration
    4. DO NOT change any API endpoint URL or response schema without updating the frontend that calls it
    5. ALWAYS run diagnostics after every file change
    6. ALWAYS rebuild Docker after backend changes, restart after frontend changes
    7. Files to DELETE after implementation (dead code): any auto-generation logic removed from orchestrator

---

## Phase 1 — Database

- [x] 1. Add `RelevanceKeyword` model and migration
  - [x] 1.1 Add `RelevanceKeyword` SQLAlchemy model to `backend/db/models.py`
    - Add class with columns: `id` (PK autoincrement), `keyword` (VARCHAR UNIQUE NOT NULL),
      `category` (VARCHAR nullable), `created_at` (DateTime default now()),
      `updated_at` (DateTime default now(), onupdate now())
    - Add index `idx_relevance_keywords_keyword` on `keyword`
    - _Requirements: 4.1_

  - [x] 1.2 Create Alembic migration for `relevance_keywords` table
    - Add migration file under `backend/migrations/` that creates the `relevance_keywords` table
      with all columns and the keyword index
    - Migration must be reversible (upgrade + downgrade)
    - _Requirements: 4.1_

- [x] 2. Create `KeywordRepository`
  - [x] 2.1 Create `backend/db/repositories/keyword_repository.py`
    - Implement `get_all() -> list[RelevanceKeyword]`
    - Implement `get_by_id(keyword_id: int) -> RelevanceKeyword | None`
    - Implement `add(keyword: str, category: str | None) -> RelevanceKeyword` — raises
      `IntegrityError` on duplicate
    - Implement `delete(keyword_id: int) -> bool` — returns `False` if not found
    - Implement `bulk_add(keywords: list[str], category: str | None = None) -> dict` — returns
      `{"created": N, "skipped": M}`
    - Implement `count() -> int`
    - Implement `seed_defaults() -> int` — inserts the full default keyword list from the design
      if the table is empty; returns count inserted
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.6_

  - [x] 2.2 Wire `seed_defaults()` into app startup in `backend/main.py`
    - Call `KeywordRepository.seed_defaults()` inside `create_app()` or equivalent startup hook,
      after `init_db()` runs, so defaults are seeded on first run when the table is empty
    - _Requirements: 4.3_

---

## Phase 2 — Backend API

- [x] 3. Create Keywords API blueprint
  - [x] 3.1 Create `backend/api/routes/keywords.py` with `keywords_bp`
    - `GET /api/keywords` → 200 JSON array of all keywords (id, keyword, category, created_at, updated_at)
    - `POST /api/keywords` → 201 created record; 409 `{"error": "Keyword already exists"}` on duplicate
    - `DELETE /api/keywords/<id>` → 204 No Content; 404 `{"error": "Keyword not found"}` if missing
    - `POST /api/keywords/bulk` → 200 `{"created": N, "skipped": M}`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.2 Register `keywords_bp` in `backend/main.py`
    - Import `keywords_bp` from `backend.api.routes.keywords` and call `app.register_blueprint(keywords_bp)`
    - _Requirements: 5.1_

- [x] 4. Update `GenerateRequest` schema and generate route
  - [x] 4.1 Update `GenerateRequest` in `backend/api/schemas.py`
    - Add optional `platforms: Optional[list[str]] = None` field
    - Add `@field_validator("platforms")` that rejects empty list with 422
      `{"error": "platforms list cannot be empty"}` and rejects unknown platform names
    - `None` passes through unchanged (means "all 8 defaults")
    - _Requirements: 6.5, 6.6_

  - [x] 4.2 Update `generate_content` route in `backend/api/routes/` to pass `platforms` to `ContentGenerator`
    - Extract `platforms = obj.platforms` (may be `None`) and pass to `ContentGenerator.generate_for_article()`
    - `None` → ContentGenerator uses its default platform list (all 8); non-None → only listed platforms
    - _Requirements: 6.2, 6.3_

---

## Phase 3 — Pipeline Changes

- [x] 5. Strip generate and schedule stages from orchestrator
  - [x] 5.1 Remove `generate` and `schedule` stages from `run_full_pipeline` in `backend/agents/orchestrator.py`
    - Delete calls to `ContentGenerator` and `ContentScheduler` inside the pipeline method
    - Remove imports of `ContentGenerator`, `ContentScheduler`, and `CreativeAgent` from orchestrator
    - Return dict must contain keys `ingestion`, `analysis`, `summary` and must NOT contain
      `generation` or `scheduling`
    - SSE stage labels emitted: `fetch` → `clean` → `deduplicate` → `analyze` → `score` →
      `summary` → `done` (never `generate` or `schedule`)
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.2 Write property test: pipeline produces no generated content (Property 1)
    - **Property 1: Pipeline produces no generated content**
    - Mock DB; record `generated_content` and `scheduled_posts` row counts before and after
      `run_full_pipeline`; assert counts are identical across ≥100 random article inputs
    - Tag: `# Feature: pipeline-content-decoupling, Property 1: pipeline produces no generated content`
    - **Validates: Requirements 1.1, 1.4**

  - [x] 5.3 Write property test: pipeline result shape (Property 2)
    - **Property 2: Pipeline result shape**
    - Run orchestrator with varied inputs; assert result dict always contains `ingestion`,
      `analysis`, `summary` and never contains `generation` or `scheduling`
    - Tag: `# Feature: pipeline-content-decoupling, Property 2: pipeline result shape`
    - **Validates: Requirements 1.2**

- [x] 6. Change `ANALYSIS_LIMIT` default to 0
  - [x] 6.1 Update `ANALYSIS_LIMIT` default in `backend/config.py` from `3` (or `50`) to `0`
    - _Requirements: 2.1, 2.2_

  - [x] 6.2 Update `AnalysisAgent.run()` in `backend/agents/analysis_agent.py` to treat `0` as "no cap"
    - `raw_limit = limit if limit is not None else int(getenv("ANALYSIS_LIMIT", "0"))`
    - `effective_limit = raw_limit if raw_limit > 0 else None`
    - Pass `effective_limit` to `analyzer.analyze_all_articles(limit=effective_limit)`
    - When `ANALYSIS_LIMIT > 0`, prioritize arXiv articles first, then descending `fetched_at`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 6.3 Write property test: analysis limit is respected (Property 3)
    - **Property 3: Analysis limit is respected**
    - For any positive integer N and M > N articles in `deduped` state, assert AnalysisAgent
      analyzes exactly N articles across ≥100 random (N, M) pairs
    - Tag: `# Feature: pipeline-content-decoupling, Property 3: analysis limit respected`
    - **Validates: Requirements 2.1, 2.3**

- [x] 7. Integrate keyword scoring into scorer
  - [x] 7.1 Add `calculate_keyword_boost()` to `backend/processors/scorer.py`
    - Implement case-insensitive substring match: count how many keywords appear in
      `(title + " " + raw_content).lower()`
    - Return: 0 matches → 0, 1 → 10, 2 → 20, 3 → 25, 4+ → 30
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [x] 7.2 Update `calculate_relevance_score()` to apply keyword boost, capped at 100
    - Accept optional `keywords: list[str] = None` parameter
    - `return min(base + self.calculate_keyword_boost(..., keywords or []), 100)`
    - _Requirements: 3.5, 3.6_

  - [x] 7.3 Update `score_all_articles()` to load keywords once before the scoring loop
    - Add `_load_keywords()` helper that queries `relevance_keywords` table via `KeywordRepository`
    - Pass keyword list into each `calculate_relevance_score()` call
    - On DB error loading keywords: log warning and continue with empty list (no boost)
    - _Requirements: 3.1, 3.6_

  - [x] 7.4 Write property test: keyword score is a pure function of match count (Property 4)
    - **Property 4: Keyword score is a pure function of match count**
    - Generate random (keyword_list, article_text) pairs; assert boost equals the exact
      step-function mapping for match counts 0–4+ across ≥100 iterations
    - Tag: `# Feature: pipeline-content-decoupling, Property 4: keyword score pure function`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 7.5 Write property test: relevance score capped at 100 (Property 5)
    - **Property 5: Relevance score capped at 100**
    - Generate random base scores and keyword lists; assert `calculate_relevance_score` ≤ 100
      across ≥100 iterations
    - Tag: `# Feature: pipeline-content-decoupling, Property 5: relevance score capped at 100`
    - **Validates: Requirements 3.5**

  - [x] 7.6 Write property test: keyword matching is case-insensitive substring (Property 6)
    - **Property 6: Case-insensitive substring matching**
    - Generate random keywords and texts with varied casing; assert match result is identical
      regardless of case transformation across ≥100 iterations
    - Tag: `# Feature: pipeline-content-decoupling, Property 6: case-insensitive substring`
    - **Validates: Requirements 3.7**

- [x] 8. Checkpoint — backend core complete
  - Ensure all backend tests pass. Run diagnostics on all modified files. Rebuild Docker.
    Ask the user if questions arise.

---

## Phase 4 — Frontend

- [x] 9. Add Generate button and PlatformSelector to `StoryCard.jsx`
  - [x] 9.1 Add state and Generate button to `frontend/src/components/StoryCard.jsx`
    - Add state: `showPlatformSelector`, `selectedPlatforms`, `generating`, `generateError`
    - Show "Generate" button when `story.posts` is empty or undefined
    - On click: open inline platform selector (8 checkboxes + Select All toggle)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Implement `PlatformSelectorDropdown` inline in `StoryCard.jsx` and wire confirm action
    - On confirm: call `POST /api/generate` with `{article_id, platforms}`
    - While in-flight: disable button, show spinner
    - On success: hide selector, show "View Content" state
    - On error: show inline error message, re-enable button
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

  - [x] 9.3 Add bulk selection checkboxes to StoryCards and bulk action toolbar to Dashboard
    - Each StoryCard gets a selection checkbox
    - When ≥1 card selected, show bulk action toolbar with "Generate for Selected" button
    - On "Generate for Selected": show PlatformSelector once for the batch; on confirm, call
      `POST /api/generate` sequentially per article; show per-article progress/error badges
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Create `KeywordsManager.jsx`
  - [x] 10.1 Create `frontend/src/components/KeywordsManager.jsx`
    - On mount: `GET /api/keywords` → render list grouped by category
    - Header shows total keyword count and scoring explanation note
    - Add form: text input + optional category dropdown + "Add Keyword" button →
      `POST /api/keywords`; on success refresh list and clear input; on 409 show inline
      "Keyword already exists" error
    - Each keyword row has a delete icon → confirm prompt → `DELETE /api/keywords/<id>` →
      refresh list; on 404 just refresh
    - "Reset to Defaults" button → `POST /api/keywords/bulk` with full default list → refresh
    - On API unreachable: show empty list with retry button
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 11. Add Keywords tab to `SettingsView.jsx`
  - [x] 11.1 Import `KeywordsManager` and add Keywords tab entry in `frontend/src/components/SettingsView.jsx`
    - Import `{ Tag }` from `lucide-react` and `KeywordsManager` from `./KeywordsManager`
    - Add `{ id: 'keywords', label: 'Keywords', icon: Tag, desc: 'relevance scoring', component: KeywordsManager }`
      to the tabs array
    - _Requirements: 10.1_

- [x] 12. Update pipeline stage labels in `AdvancedTools.jsx`
  - [x] 12.1 Replace any "Generating" / "Scheduling" stage labels in `frontend/src/components/AdvancedTools.jsx` with the new set: `Fetching` → `Analyzing` →
    `Scoring` → `Done`
    - _Requirements: 9.3, 9.4_

---

## Phase 5 — Tests

- [x] 13. Write property-based tests for keyword scoring (Hypothesis)
  - [x] 13.1 Write property test: keyword uniqueness (Property 7)
    - **Property 7: Keyword uniqueness**
    - Insert same keyword twice via `KeywordRepository`; assert exactly one row in table across
      ≥100 random keyword strings
    - Tag: `# Feature: pipeline-content-decoupling, Property 7: keyword uniqueness`
    - **Validates: Requirements 4.2, 5.3**

  - [x] 13.2 Write property test: keyword API round-trip (Property 8)
    - **Property 8: Keyword API round-trip**
    - Insert via `POST /api/keywords`; assert present in `GET /api/keywords`; delete via
      `DELETE /api/keywords/<id>`; assert absent in subsequent `GET /api/keywords`
    - Tag: `# Feature: pipeline-content-decoupling, Property 8: keyword API round-trip`
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [x] 13.3 Write property test: bulk insert skips duplicates (Property 9)
    - **Property 9: Bulk keyword insert skips duplicates**
    - Generate lists with random duplicates; assert `created + skipped == total input count`
      across ≥100 iterations
    - Tag: `# Feature: pipeline-content-decoupling, Property 9: bulk insert skips duplicates`
    - **Validates: Requirements 5.6**

  - [x] 13.4 Write property test: platform-selective generation (Property 10)
    - **Property 10: Platform-selective generation**
    - For any non-empty subset S of the 8 platforms, call `POST /api/generate` with
      `{article_id, platforms: S}`; assert DB contains generated content for exactly S and no
      other platforms across ≥100 random subsets
    - Tag: `# Feature: pipeline-content-decoupling, Property 10: platform-selective generation`
    - **Validates: Requirements 6.2**

  - [x] 13.5 Write property test: existing generated content is preserved (Property 11)
    - **Property 11: Existing generated content is preserved**
    - Insert content rows; run `run_full_pipeline`; assert rows are unchanged (same content,
      same count) across ≥100 random article sets
    - Tag: `# Feature: pipeline-content-decoupling, Property 11: existing content preserved`
    - **Validates: Requirements 11.4**

- [x] 14. Write frontend tests for StoryCard platform selector (Vitest + React Testing Library)
  - [x] 14.1 Create `frontend/src/components/StoryCard.test.jsx`
    - Generate button visible when `story.posts` is empty or undefined
    - Platform selector renders all 8 checkboxes on Generate click
    - "Select All" toggle selects/deselects all checkboxes
    - Confirm calls `POST /api/generate` with correct `article_id` and `platforms` payload
    - Loading state disables button and shows spinner
    - Error state shows inline error and re-enables button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 14.2 Create `frontend/src/components/KeywordsManager.test.jsx`
    - Renders keyword list grouped by category
    - Add flow: input + submit → API called → list refreshed → input cleared
    - Duplicate add → inline "Keyword already exists" shown
    - Delete flow: click × → confirm → API called → list refreshed
    - Reset to Defaults calls bulk endpoint
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

---

## Phase 6 — Cleanup & Verification

- [x] 15. Delete dead code files
  - [x] 15.1 Verify zero active imports, then delete any auto-generation logic files removed from the orchestrator
    - Confirm `CreativeAgent` is no longer imported anywhere before deleting or gutting it
    - Confirm any scheduler wiring removed from orchestrator has no other callers
    - Run diagnostics after each deletion
    - _Requirements: 1.3_

- [x] 16. Update technical documentation
  - [x] 16.1 Update `README.md`, `TECHNICAL_ARCHITECTURE.md` (or equivalent), and `RUNBOOK.md` to reflect the new two-phase architecture: pipeline stops after scoring; content generation is user-triggered via `POST /api/generate`
    - Document the new `GET/POST/DELETE /api/keywords` endpoints
    - Document `ANALYSIS_LIMIT` default change (0 = all)

- [x] 17. Final verification
  - [x] 17.1 Rebuild Docker and run a clean state reset
    - `POST /api/system/reset-data` with `X-Reset-Confirm: yes`
    - Rebuild Docker image after all backend changes
  - [x] 17.2 Trigger a fresh pipeline run and verify pipeline isolation
    - Run `POST /api/pipeline/run` and assert `generated_content` table has 0 new rows
    - Assert `scheduled_posts` table has 0 new rows
    - _Requirements: 1.4_
  - [x] 17.3 Verify user-triggered generation produces exactly the requested rows
    - Call `POST /api/generate` with `{"article_id": <id>, "platforms": ["twitter"]}` and assert
      exactly 1 new row in `generated_content` for the twitter platform only
    - _Requirements: 6.2_
  - [x] 17.4 Final checkpoint — ensure all tests pass
    - Run full test suite. Ensure all tests pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis (backend) and Vitest + fast-check (frontend)
- Each property test must include the tag comment referencing the feature and property number
- Checkpoints ensure incremental validation after each phase
- The pipeline must never write to `generated_content` or `scheduled_posts` after this change
