# Requirements Document

## Introduction

AI Pulse Pro currently runs a monolithic pipeline that fetches articles, analyzes a capped subset, then
auto-generates social content for all 8 platforms and auto-schedules everything — producing up to 400
simultaneous LLM calls, tripping circuit breakers, and filling the database with `system_fallback` junk
content the user never asked for.

This feature decouples the pipeline into two distinct concerns:

1. **Automated Analysis Pipeline** — runs on schedule; fetches, cleans, deduplicates, analyzes, and
   scores ALL fetched articles. Stops there. No content generation, no scheduling.

2. **User-Triggered Content Generation** — the user browses the scored feed, selects an article, picks
   which platforms to generate for, and clicks Generate. Content is created only for the chosen
   platforms, reviewed by the user, then approved for scheduling or immediate posting.

The change also introduces keyword-based relevance scoring (a configurable keyword list stored in the
database) and a Settings UI for managing those keywords.

---

## Glossary

- **Pipeline**: The automated, scheduled process that fetches and analyzes articles.
- **Orchestrator**: `MultiAgentOrchestrator` — the Python class that coordinates pipeline stages.
- **IngestionAgent**: The agent responsible for fetching raw articles from all sources.
- **AnalysisAgent**: The agent responsible for cleaning, deduplicating, and LLM-analyzing articles.
- **ContentGenerator**: `ContentGenerator` in `generator_v5.py` — generates platform-specific posts.
- **ContentScheduler**: `ContentScheduler` — queues generated content for future publishing.
- **RawArticle**: A database record representing a fetched, unprocessed article.
- **ProcessedArticle**: A database record holding LLM analysis results for a RawArticle.
- **GeneratedContent**: A database record holding a platform-specific post for a ProcessedArticle.
- **ScheduledPost**: A database record representing a post queued for future publishing.
- **RelevanceKeyword**: A user-defined keyword stored in the database used to boost article relevance scores.
- **KeywordScore**: The component of an article's relevance score derived from RelevanceKeyword matches.
- **PlatformSelector**: The UI component that lets the user choose which platforms to generate content for.
- **Dashboard**: The main feed view in the frontend showing scored and prioritized articles.
- **StoryCard**: A single article card in the Dashboard.
- **Settings**: The frontend settings page where the user configures the application.
- **ANALYSIS_LIMIT**: A configurable integer controlling the maximum number of articles analyzed per pipeline run (default: all fetched articles).
- **system_fallback**: The placeholder text written to GeneratedContent when an LLM call fails — the root cause of junk content in the DB.

---

## Requirements

### Requirement 1: Pipeline Stops After Analysis

**User Story:** As a user, I want the automated pipeline to only fetch and analyze articles, so that
content is never generated or scheduled without my explicit approval.

#### Acceptance Criteria

1. WHEN the Pipeline runs, THE Orchestrator SHALL execute ingestion and analysis stages only, and SHALL
   NOT invoke the ContentGenerator or ContentScheduler.
2. WHEN the Pipeline completes, THE Orchestrator SHALL return a result object that includes ingestion
   counts, analysis counts, and scoring counts, and SHALL NOT include content generation or scheduling
   counts.
3. THE Orchestrator SHALL remove the `generate` and `schedule` stages from `run_full_pipeline`.
4. WHEN the Pipeline is triggered via `POST /api/pipeline/run`, THE Pipeline SHALL complete without
   writing any new rows to the `generated_content` or `scheduled_posts` tables.

---

### Requirement 2: Analyze All Fetched Articles (Remove Hard Cap)

**User Story:** As a user, I want every fetched article to be analyzed, so that I can browse the full
scored feed and choose what to generate content for.

#### Acceptance Criteria

1. WHEN the AnalysisAgent runs, THE AnalysisAgent SHALL analyze all RawArticles in `deduped` state,
   unless the `ANALYSIS_LIMIT` configuration value is explicitly set to a positive integer, in which
   case THE AnalysisAgent SHALL analyze at most that many articles per run.
2. THE AnalysisAgent SHALL default to analyzing all eligible articles when `ANALYSIS_LIMIT` is unset or
   set to `0`.
3. WHEN `ANALYSIS_LIMIT` is set to a positive integer N, THE AnalysisAgent SHALL prioritize articles
   from arXiv first, then by descending `fetched_at`, up to N articles.
4. THE Pipeline SHALL NOT skip or discard any fetched RawArticle before the analysis stage completes.

---

### Requirement 3: Keyword-Based Relevance Scoring

**User Story:** As a user, I want articles that contain my chosen AI keywords to score higher, so that
the most relevant content rises to the top of my feed.

#### Acceptance Criteria

1. THE Scorer SHALL calculate a KeywordScore for each ProcessedArticle by counting how many
   RelevanceKeywords appear (case-insensitive) in the concatenation of the RawArticle's `title` and
   `raw_content` fields.
2. WHEN a ProcessedArticle's keyword match count is 0, THE Scorer SHALL assign a KeywordScore of 0.
3. WHEN a ProcessedArticle's keyword match count is between 1 and 4 (inclusive), THE Scorer SHALL
   assign a KeywordScore between 10 and 25 points (10 points per match, capped at 25).
4. WHEN a ProcessedArticle's keyword match count is 5 or more, THE Scorer SHALL assign a KeywordScore
   of 30 points (the maximum keyword contribution).
5. THE Scorer SHALL add the KeywordScore to the existing `relevance_score` calculation, with the total
   `relevance_score` capped at 100.
6. WHEN no RelevanceKeywords exist in the database, THE Scorer SHALL calculate `relevance_score` using
   only the existing category, source, and behavioral boost components.
7. THE Scorer SHALL treat keyword matching as case-insensitive and SHALL match partial words (substring
   match within the text).

---

### Requirement 4: Keyword Management — Storage

**User Story:** As a user, I want my relevance keywords stored in the database, so that they persist
across restarts and can be managed through the UI.

#### Acceptance Criteria

1. THE System SHALL store RelevanceKeywords in a dedicated `relevance_keywords` database table with
   columns: `id` (integer primary key), `keyword` (string, unique, not null), `category` (string,
   nullable), `created_at` (datetime), `updated_at` (datetime).
2. WHEN a duplicate keyword is inserted, THE System SHALL return a 409 Conflict response and SHALL NOT
   create a duplicate row.
3. THE System SHALL seed the `relevance_keywords` table with the default keyword list defined in this
   specification on first run if the table is empty.
4. THE System SHALL preserve all existing RelevanceKeywords when the application restarts.

---

### Requirement 5: Keyword Management — API

**User Story:** As a user, I want a REST API for managing my relevance keywords, so that the frontend
Settings page can perform full CRUD operations.

#### Acceptance Criteria

1. THE System SHALL expose `GET /api/keywords` which returns all RelevanceKeywords as a JSON array,
   each with `id`, `keyword`, `category`, `created_at`, and `updated_at` fields.
2. THE System SHALL expose `POST /api/keywords` which accepts `{"keyword": string, "category":
   string|null}` and creates a new RelevanceKeyword, returning the created record with HTTP 201.
3. IF a `POST /api/keywords` request is made with a keyword that already exists (case-insensitive),
   THEN THE System SHALL return HTTP 409 with `{"error": "Keyword already exists"}`.
4. THE System SHALL expose `DELETE /api/keywords/<id>` which removes the RelevanceKeyword with the
   given id and returns HTTP 204.
5. IF a `DELETE /api/keywords/<id>` request references a non-existent id, THEN THE System SHALL return
   HTTP 404 with `{"error": "Keyword not found"}`.
6. THE System SHALL expose `POST /api/keywords/bulk` which accepts `{"keywords": [string]}` and creates
   multiple RelevanceKeywords in a single transaction, skipping duplicates and returning a summary of
   created vs skipped counts.

---

### Requirement 6: User-Triggered Content Generation — Backend

**User Story:** As a user, I want to generate content for a specific article and specific platforms on
demand, so that I only create content I actually intend to use.

#### Acceptance Criteria

1. THE System SHALL keep the existing `POST /api/generate` endpoint unchanged in its URL, authentication,
   and response schema.
2. WHEN `POST /api/generate` is called with `{"article_id": N, "platforms": ["twitter", "linkedin"]}`,
   THE ContentGenerator SHALL generate content only for the listed platforms and SHALL NOT generate
   content for any platform not in the list.
3. WHEN `POST /api/generate` is called with `{"article_id": N}` and no `platforms` field, THE
   ContentGenerator SHALL generate content for all 8 default platforms (twitter, linkedin, blog,
   instagram, facebook, reddit, youtube, threads) to preserve backward compatibility.
4. WHEN `POST /api/generate` is called for an article that has not yet been analyzed, THE
   ContentGenerator SHALL trigger on-demand analysis for that article before generating content.
5. IF `POST /api/generate` is called with an empty `platforms` array, THEN THE System SHALL return HTTP
   422 with `{"error": "platforms list cannot be empty"}`.
6. THE System SHALL update the `GenerateRequest` Pydantic schema to accept an optional `platforms` field
   of type `list[str]`.

---

### Requirement 7: User-Triggered Content Generation — Frontend Platform Selector

**User Story:** As a user, I want to choose which platforms to generate content for directly from the
story card, so that I don't waste LLM calls on platforms I don't use.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Generate" button on each StoryCard for articles that have not yet had
   content generated.
2. WHEN the user clicks the "Generate" button on a StoryCard, THE PlatformSelector SHALL appear as a
   dropdown or modal showing checkboxes for: Twitter, LinkedIn, Blog, Instagram, Facebook, Reddit,
   YouTube, Threads.
3. THE PlatformSelector SHALL allow the user to select any combination of one or more platforms.
4. THE PlatformSelector SHALL include a "Select All" toggle that selects or deselects all platforms at
   once.
5. WHEN the user confirms the selection, THE Dashboard SHALL call `POST /api/generate` with the
   `article_id` and the selected `platforms` array.
6. WHILE content generation is in progress, THE StoryCard SHALL display a loading indicator and SHALL
   disable the Generate button to prevent duplicate submissions.
7. WHEN content generation succeeds, THE StoryCard SHALL update to show a "View Content" state and SHALL
   display the generated content for the selected platforms.
8. IF content generation fails, THE Dashboard SHALL display an error message on the StoryCard and SHALL
   re-enable the Generate button.

---

### Requirement 8: User-Triggered Content Generation — Bulk Operations

**User Story:** As a user, I want to generate content for multiple selected articles at once using the
platform selector, so that I can batch-process a curated set of articles efficiently.

#### Acceptance Criteria

1. THE Dashboard SHALL allow the user to select multiple StoryCards using checkboxes.
2. WHEN one or more StoryCards are selected, THE Dashboard SHALL display a bulk action toolbar with a
   "Generate for Selected" button.
3. WHEN the user clicks "Generate for Selected", THE PlatformSelector SHALL appear once for the entire
   batch, allowing the user to choose platforms that apply to all selected articles.
4. WHEN the user confirms the bulk selection, THE Dashboard SHALL call `POST /api/generate` once per
   selected article with the chosen platforms, processing requests sequentially to avoid circuit breaker
   trips.
5. THE Dashboard SHALL display per-article progress during bulk generation, showing success or failure
   for each article individually.

---

### Requirement 9: Remove Auto-Generate UI Affordances

**User Story:** As a user, I want the UI to clearly reflect that content generation is always
user-initiated, so that I am never confused about what the pipeline does automatically.

#### Acceptance Criteria

1. THE Dashboard SHALL NOT display any UI element that implies the pipeline auto-generates content (e.g.,
   "Auto-generate", "Pipeline will generate", or similar labels).
2. THE Dashboard SHALL display a status indicator showing the last pipeline run time and the count of
   newly analyzed articles.
3. WHEN the pipeline is running, THE Dashboard SHALL display a "Fetching & Analyzing" status label and
   SHALL NOT display a "Generating Content" status label.
4. THE Dashboard pipeline status display SHALL use the labels: "Fetching", "Analyzing", "Scoring", and
   "Done" — and SHALL NOT include "Generating" or "Scheduling" as pipeline stages.

---

### Requirement 10: Settings — Keywords Tab

**User Story:** As a user, I want a dedicated Keywords section in Settings, so that I can manage my
relevance keyword list without editing code or environment variables.

#### Acceptance Criteria

1. THE Settings page SHALL include a "Keywords" tab or section.
2. THE Keywords section SHALL display all RelevanceKeywords grouped by category, fetched from
   `GET /api/keywords`.
3. THE Keywords section SHALL provide an input field and "Add Keyword" button that calls
   `POST /api/keywords` with the entered text.
4. WHEN a keyword is successfully added, THE Keywords section SHALL refresh the keyword list and clear
   the input field.
5. IF the user attempts to add a duplicate keyword, THE Keywords section SHALL display an inline error
   message "Keyword already exists" and SHALL NOT add a duplicate entry to the list.
6. THE Keywords section SHALL display a delete icon next to each keyword that calls
   `DELETE /api/keywords/<id>` when clicked, with a confirmation prompt before deletion.
7. THE Keywords section SHALL provide a "Reset to Defaults" button that calls `POST /api/keywords/bulk`
   with the default keyword list, skipping any that already exist.
8. THE Keywords section SHALL display the total keyword count and a note explaining how keywords affect
   article scoring.

---

### Requirement 11: Backward Compatibility — Existing Generated Content

**User Story:** As a user, I want all previously generated content to remain accessible after this
architectural change, so that I don't lose any work already done.

#### Acceptance Criteria

1. THE System SHALL NOT delete, modify, or migrate any existing rows in the `generated_content` table
   during deployment of this feature.
2. THE System SHALL NOT delete, modify, or migrate any existing rows in the `scheduled_posts` table
   during deployment of this feature.
3. THE System SHALL NOT delete, modify, or migrate any existing rows in the `processed_articles` table
   during deployment of this feature.
4. WHEN the updated pipeline runs for the first time after deployment, THE Orchestrator SHALL NOT
   overwrite or re-generate content for articles that already have rows in `generated_content`.
5. THE existing `POST /api/schedule/queue` endpoint SHALL remain unchanged in URL, request schema, and
   response schema.

---

### Requirement 12: Configuration — Pipeline Behavior

**User Story:** As a user, I want to configure pipeline behavior through the Settings page and
environment variables, so that I can tune the system without code changes.

#### Acceptance Criteria

1. THE System SHALL support an `ANALYSIS_LIMIT` configuration key (environment variable and
   `user_preferences` table entry) that controls the maximum number of articles analyzed per pipeline
   run; a value of `0` or absence of the key means analyze all.
2. THE System SHALL support a `FETCH_SOURCES` configuration key that accepts a comma-separated list of
   source names (`arxiv`, `github`, `rss`, `gmail`, `reddit`) to control which sources the
   IngestionAgent fetches from; absence of the key means fetch from all sources.
3. WHEN `ANALYSIS_LIMIT` is updated via `POST /api/config`, THE AnalysisAgent SHALL use the new value
   on the next pipeline run without requiring a restart.
4. THE Settings page SHALL expose `ANALYSIS_LIMIT` and `FETCH_SOURCES` as editable fields in a
   "Pipeline" configuration section.

---

### Requirement 13: Podcast, Image, and Blog Generation Remain User-Triggered

**User Story:** As a user, I want podcast, quote card, and blog generation to continue working exactly
as they do today, so that this architectural change does not break existing media workflows.

#### Acceptance Criteria

1. THE System SHALL NOT modify the podcast generation flow; podcast generation SHALL remain triggered
   only by explicit user action.
2. THE System SHALL NOT modify the image/quote card generation flow; image generation SHALL remain
   triggered only by explicit user action in the Media view.
3. THE System SHALL NOT modify the blog generation flow; blog post generation SHALL remain triggered
   only by explicit user action in the Research Deep Dive view.
4. THE existing regenerate, copy, and download actions in the Research Deep Dive view SHALL remain
   unchanged.
