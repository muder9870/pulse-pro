# Fetcher Tasks

All issues are sourced directly from reading the code. No assumptions.

---

## 1. arxiv_fetcher.py

**File:** `backend/fetchers/arxiv_fetcher.py`

### 1.1 Add retry logic to `fetch_latest_papers`
- **Location:** `ArxivFetcher.fetch_latest_papers` — line `resp = requests.get(url, timeout=15)`
- **Problem:** A single network timeout or transient HTTP error raises immediately and aborts the entire category. No retry is attempted.
- **Fix:** Wrap the `requests.get` + `resp.raise_for_status()` block in a retry loop with exponential backoff (3 attempts, 2s base delay). Log each retry attempt. Skip the category only after all retries are exhausted.

### 1.2 Remove unused import `inspect`
- **Location:** `save_to_db` — `from sqlalchemy import inspect`
- **Problem:** `inspect` is imported but never used anywhere in the method.
- **Fix:** Remove the import line.

### 1.3 Remove SQLite dialect branching — repo is PostgreSQL-only
- **Location:** `save_to_db` — entire `if dialect == "sqlite": ... elif dialect == "postgresql": ... else:` block
- **Problem:** `config.py` defaults to `sqlite:///` only when `DATABASE_URL` env var is unset. `.env.example` and `docker-compose.yml` always set `DATABASE_URL` to `postgresql+psycopg2://...`. Every other fetcher (`github_fetcher`, `gmail_fetcher_smart`, `reddit_fetcher`, `rss_fetcher`, `inoreader_fetcher`) hardcodes `pg_insert` with no dialect check. The SQLite branch in `arxiv_fetcher` is inconsistent dead weight.
- **Fix:** Remove the dialect detection. Use `pg_insert(...).on_conflict_do_nothing(index_elements=['url'])` directly, matching all other fetchers. Remove `from sqlalchemy.dialects.sqlite import insert as sqlite_insert` and the `session.bind.dialect.name` call.

---

## 2. github_fetcher.py

**File:** `backend/fetchers/github_fetcher.py`

### 2.1 Remove duplicate `from __future__ import annotations`
- **Location:** Lines 1–2
- **Problem:** `from __future__ import annotations` appears twice at the top of the file.
- **Fix:** Remove the duplicate line.

### 2.2 ~~Add SQLite fallback to `fetch_trending`~~ — NOT NEEDED
- **Status:** Removed. Repo is PostgreSQL-only (see task 1.3). `pg_insert` hardcoded in `fetch_trending` is correct and consistent with all other fetchers.

### 2.3 Rate limit handling only covers 403, not 429
- **Location:** `_get` — `if resp.status_code == 403`
- **Problem:** GitHub returns HTTP 429 for secondary rate limits (abuse detection). Only 403 is handled; 429 will raise via `raise_for_status()` without the 60s sleep.
- **Fix:** Change condition to `if resp.status_code in (403, 429)`.

### 2.4 No delay between README fetches
- **Location:** `fetch_trending` — `readme = self._fetch_readme(full_name)` called inside the repo loop
- **Problem:** Each topic loop already has `time.sleep(1)` between topics, but README fetches happen inside the repo loop with no delay. For 10 repos per topic × 14 topics = up to 140 README API calls with no spacing, which will trigger secondary rate limits.
- **Fix:** Add `time.sleep(0.5)` after each `_fetch_readme` call, or batch README fetches with a small delay.

### 2.5 Missing `session.commit()` after inserts
- **Location:** `fetch_trending` — `with get_session() as session:` insert block
- **Problem:** No explicit `session.commit()` call after the insert loop. Relies entirely on `get_session` context manager auto-commit. If `get_session` does not auto-commit on exit, inserts are silently lost.
- **Fix:** Add `session.commit()` after the insert loop, consistent with how other fetchers handle it.

---

## 3. gmail_fetcher_smart.py

**File:** `backend/fetchers/gmail_fetcher_smart.py`

### 3.1 `"mail" in sender_lower` is too broad in `_is_newsletter`
- **Location:** `_is_newsletter` — `"mail" in sender_lower`
- **Problem:** Matches any sender whose email contains the string "mail" — including `gmail.com`, `hotmail.com`, `mail.google.com`. This will classify almost every Gmail sender as a newsletter sender.
- **Fix:** Remove `"mail" in sender_lower` from the `is_newsletter_sender` check. The remaining patterns (`newsletter`, `noreply`, `news`, `updates`, `digest`) are sufficient and specific.

### 3.2 Same false-positive in `_calculate_confidence`
- **Location:** `_calculate_confidence` — `elif "mail" in sender_lower: score += 0.1`
- **Problem:** Same issue as 3.1 — adds 0.1 confidence score to every Gmail sender.
- **Fix:** Remove the `elif "mail" in sender_lower` branch.

### 3.3 No reconnect on dropped IMAP connection
- **Location:** `fetch_newsletters` and `_fetch_from_label` — all `self.conn.*` calls
- **Problem:** If the IMAP connection drops mid-fetch (timeout, server reset), all subsequent `self.conn.fetch`, `self.conn.search`, `self.conn.select` calls raise `imaplib.IMAP4.abort` or `OSError`. There is no reconnect attempt.
- **Fix:** Add a `_reconnect()` helper that calls `self.close()` then `self.connect()`. Wrap the per-message fetch loop in a try/except that calls `_reconnect()` on `imaplib.IMAP4.abort` and retries once.

### 3.4 `_save_links` stores `raw_content=None`
- **Location:** `_save_links` — `raw_content=None`
- **Problem:** Every article saved from Gmail has `raw_content=None`. The downstream LLM scorer/analyzer has no text to work with — only a URL and title.
- **Fix:** After extracting links in `_extract_links_and_snippets`, also extract surrounding paragraph text from the email body (the `<p>` or text node adjacent to each `<a>` tag) and pass it as `raw_content`.

### 3.5 `re` is imported but never used
- **Location:** Top of file — `import re`
- **Problem:** `re` is imported but no regex operations exist anywhere in the file.
- **Fix:** Remove `import re`.

### 3.6 `_create_senders_table` called on every `discover_newsletters` run
- **Location:** `discover_newsletters` — first line calls `self._create_senders_table()`
- **Problem:** `Base.metadata.create_all` is called on every discovery run, even when the table already exists. This is a redundant DDL call on every ingestion cycle.
- **Fix:** Call `_create_senders_table` once in `__init__` or guard it with a class-level flag `_table_ensured = False`.

---

## 4. inoreader_fetcher.py

**File:** `backend/fetchers/inoreader_fetcher.py`

### 4.1 No token expiry / refresh handling
- **Location:** `fetch_unread_items` — `if not self.auth_token and not self.authenticate()`
- **Problem:** Token is only fetched once. If the token expires mid-run (Inoreader tokens expire), all subsequent API calls return 401 and `fetch_unread_items` silently returns `[]` without re-authenticating.
- **Fix:** On HTTP 401 response, call `self.authenticate()` once to refresh the token and retry the request. If re-auth fails, log and return `[]`.

### 4.2 `grant_type=password` is deprecated by OAuth 2.0 spec
- **Location:** `authenticate` — `"grant_type": "password"`
- **Problem:** Resource Owner Password Credentials grant is deprecated in OAuth 2.1 and many providers have disabled it. Inoreader's current API uses OAuth authorization code flow.
- **Fix:** Document this clearly in the class docstring. If Inoreader still supports it, add a comment noting it may break. Ideally replace with token-based auth where the user provides a pre-obtained access token via env var `INOREADER_ACCESS_TOKEN`.

### 4.3 No retry logic on network requests
- **Location:** `fetch_unread_items` — `response = requests.get(...)`
- **Problem:** Single attempt. A transient timeout returns `[]` silently.
- **Fix:** Add retry with exponential backoff (3 attempts) consistent with `rss_fetcher.py`'s `@retry_on_failure` decorator. Either import and reuse that decorator or duplicate the pattern.

### 4.4 `parse_item` does not guard against missing `canonical` list items
- **Location:** `parse_item` — `url = canonical[0].get("href") if canonical else ""`
- **Problem:** If `canonical` is a non-empty list but `canonical[0]` has no `"href"` key, `.get("href")` returns `None` and `url` is `None`. This gets passed to `save_to_db` and will fail the DB insert with a NOT NULL violation on the `url` column.
- **Fix:** Add `url = url or ""` after the canonical/alternate extraction, and skip saving if `not url`.

### 4.5 `save_to_db` does not skip articles with empty `url` or `title`
- **Location:** `save_to_db` — iterates `articles` and inserts directly
- **Problem:** No validation before insert. Empty `url` or `title` will either violate DB constraints or insert garbage rows.
- **Fix:** Add `if not article.get("url") or not article.get("title"): continue` at the top of the loop.

---

## 5. reddit_fetcher.py

**File:** `backend/fetchers/reddit_fetcher.py`

### 5.1 Uses `print()` instead of `logging`
- **Location:** `fetch_top_posts` — `print(f"[reddit_fetcher] Error fetching posts: {e}")`
- **Problem:** All other fetchers use `logging`. `print` output is invisible in production log aggregators.
- **Fix:** Replace with `logging.getLogger("reddit_fetcher")` and use `logger.error(...)`.

### 5.2 Silent `except: pass` swallows all insert errors
- **Location:** `fetch_top_posts` — `except Exception: pass` inside the insert loop
- **Problem:** Any DB error (constraint violation, connection drop, schema mismatch) is silently ignored. No way to diagnose insert failures.
- **Fix:** Replace with `except Exception as e: logger.warning("insert_failed url=%s error=%s", p["url"], e)`.

### 5.3 No rate limiting between subreddits
- **Location:** `fetch_top_posts` — `for sub in subreddits:` loop
- **Problem:** PRAW makes multiple API calls per subreddit with no delay between subreddits. Reddit's API rate limit is 60 requests/minute for authenticated apps. With many subreddits this can trigger 429s.
- **Fix:** Add `time.sleep(1)` between subreddits, consistent with `github_fetcher.py`.

### 5.4 No retry on PRAW network errors
- **Location:** `fetch_top_posts` — `for post in subreddit.hot(limit=limit)`
- **Problem:** PRAW raises `prawcore.exceptions.RequestException` on network errors. The outer `except Exception` catches it but saves nothing and logs nothing useful.
- **Fix:** Wrap the per-subreddit fetch in its own try/except with a logger call, so one failing subreddit doesn't abort the rest.

### 5.5 `settings` is imported but never used
- **Location:** Top of file — `from ..config import settings`
- **Problem:** `settings` is imported but not referenced anywhere in the file. Credentials come from `getenv` in `main()`.
- **Fix:** Remove the import.

---

## 6. rss_fetcher.py

**File:** `backend/fetchers/rss_fetcher.py`

### 6.1 Dead (unreachable) code block after `return` in `discover_new_feeds`
- **Location:** `discover_new_feeds` — after `return {"added": ..., "added_count": ..., "failed_count": ...}` there is an entire OPML parsing block (`"""Import RSS feeds from OPML format..."""` through `return 0`)
- **Problem:** This code is unreachable. It appears to be a leftover from a method that was split but the body was not removed. It will never execute.
- **Fix:** Delete the entire unreachable block (from the docstring `"""Import RSS feeds from OPML format (exported from Inoreader)."""` to the final `return 0` of that block).

### 6.2 `session.bind` deprecated in SQLAlchemy 2.x (inherited pattern not present here, but `fetch_feed` uses `session.query` ORM style)
- **Location:** `fetch_feed` — `session.query(RSSFeed).filter(...)` and `session.query(RSSFeedItem).filter(...)`
- **Problem:** Not a bug, but `session.query()` is the legacy ORM API. SQLAlchemy 2.x recommends `select()` statements. Not urgent but worth noting for consistency.
- **Fix:** Low priority. Can be migrated to `session.execute(select(RSSFeed).where(...))` in a separate refactor pass.

### 6.3 `timedelta` is imported but never used
- **Location:** Top of file — `from datetime import datetime, timezone, timedelta`
- **Problem:** `timedelta` is imported but not used anywhere in the file.
- **Fix:** Remove `timedelta` from the import.

### 6.4 `urlparse` and `urljoin` are imported but never used
- **Location:** Top of file — `from urllib.parse import urljoin, urlparse`
- **Problem:** Neither `urljoin` nor `urlparse` is called anywhere in the file.
- **Fix:** Remove both from the import.

### 6.5 `ET` (xml.etree.ElementTree) is imported but only used in dead code
- **Location:** Top of file — `import xml.etree.ElementTree as ET`
- **Problem:** `ET` is only referenced inside the unreachable OPML block (see 6.1). Once that block is removed, `ET` has no usages.
- **Fix:** Remove `import xml.etree.ElementTree as ET` after removing the dead code block.

### 6.6 `fetch_feed` does not commit after updating `RSSFeed` stats on error path
- **Location:** `fetch_feed` error handler — `feed.last_error = str(e); feed.error_count += 1; feed.updated_at = ...; session.commit()`
- **Problem:** Actually `session.commit()` is present here. No bug. ✓

### 6.7 `health_check_feeds` makes live HTTP requests inside a DB transaction
- **Location:** `health_check_feeds` — `resp = self.session.get(feed.url, timeout=10)` is called while `with get_session() as session:` is open
- **Problem:** HTTP requests inside an open DB transaction hold the connection for the duration of the HTTP call. With many feeds and slow responses, this can exhaust the DB connection pool.
- **Fix:** Collect the list of feeds to check first (close the DB session), perform all HTTP checks, then open a new DB session to apply the deactivations.

### 6.8 Default feed list contains likely-dead URLs
- **Location:** `__init__` — `self.default_feeds` list
- **Problem:** The following URLs are known to be dead or redirected as of 2024–2025:
  - `https://distill.pub/rss.xml` — Distill.pub stopped publishing in 2021
  - `https://openai.com/blog/rss/` and `https://blog.openai.com/rss/` — duplicate entries; OpenAI moved to a different blog structure
  - `https://deepmind.com/blog/feed/basic/` — DeepMind rebranded to Google DeepMind; URL likely redirects or 404s
  - `https://research.facebook.com/feed/` — Meta AI Research changed their site structure
  - `https://ai.googleblog.com/feeds/posts/default` — Google AI Blog moved to `blog.research.google`
- **Fix:** Remove confirmed dead URLs. Keep `https://blog.research.google/feeds/posts/default`. Remove the duplicate OpenAI entry. Verify remaining URLs before next deploy.

---

## 7. url_fetcher.py

**File:** `backend/fetchers/url_fetcher.py`

### 7.1 Dead import in `ingestion_agent.py`
- **Location:** `backend/agents/ingestion_agent.py` — `from backend.fetchers.url_fetcher import UrlFetcher`
- **Problem:** `UrlFetcher` is imported but never instantiated or called anywhere in `IngestionAgent`. It is not in the `run()` method.
- **Fix:** Remove the import from `ingestion_agent.py`.

### 7.2 No retry logic
- **Location:** `fetch_urls` — `resp = requests.get(url, timeout=10, ...)`
- **Problem:** Single attempt per URL. Any timeout or transient error silently skips the URL.
- **Fix:** Wrap in retry loop (3 attempts, exponential backoff) before logging warning and continuing.

### 7.3 Generic `<p>` tag scraping produces low-quality content
- **Location:** `fetch_urls` — `paragraphs = soup.find_all('p')`
- **Problem:** Scraping all `<p>` tags from TechCrunch/VentureBeat/The Verge captures navigation text, cookie banners, footer text, and ad copy alongside article content. The resulting `raw_content` is noisy and of low value to the LLM.
- **Fix:** Replace with `trafilatura` library (`trafilatura.fetch_url` + `trafilatura.extract`) which uses content extraction heuristics to isolate article body text. Falls back to `<p>` scraping if `trafilatura` returns nothing.

### 7.4 Default URLs overlap entirely with `rss_fetcher.py` default feeds
- **Location:** `__init__` — `self.urls` default list
- **Problem:** TechCrunch AI, VentureBeat AI, and The Verge AI are all in `rss_fetcher.py`'s `default_feeds`. Running both fetchers ingests duplicate content from the same sources.
- **Fix:** Either remove the default URL list and require explicit URLs to be passed, or replace defaults with sources not covered by RSS (e.g., sites with no RSS feed).

### 7.5 No JS rendering — modern sites return empty content
- **Location:** `fetch_urls` — `resp = requests.get(url, timeout=10, ...)`
- **Problem:** TechCrunch, VentureBeat, and The Verge all render article lists via JavaScript. A plain `requests.get` returns the HTML shell with no article content. `BeautifulSoup` then finds no meaningful `<p>` tags.
- **Fix:** Either use `playwright` / `selenium` for JS rendering, or replace these URLs with their RSS equivalents (already in `rss_fetcher.py`) and repurpose `UrlFetcher` strictly for static/non-JS pages.

### 7.6 Content truncation at 50,000 chars is arbitrary with no chunking
- **Location:** `fetch_urls` — `if len(content) > 50000: content = content[:50000]`
- **Problem:** Hard truncation at 50k chars can cut mid-sentence. No indication in the stored data that content was truncated.
- **Fix:** If keeping this fetcher, truncate at a sentence boundary or add a `content_truncated=True` flag to the stored record.

---

## Priority Order

| Priority | Task IDs | Reason |
|---|---|---|
| High | 7.1 | Dead import causing confusion about what runs |
| High | 1.3 | SQLite dialect branching in arxiv_fetcher is inconsistent — remove it |
| High | 3.1, 3.2 | False positives classify every Gmail user as newsletter sender |
| High | 6.1 | Unreachable code block is a maintenance hazard |
| High | 7.3, 7.5 | url_fetcher produces empty/noisy content on all default URLs |
| Medium | 1.1, 2.1, 5.1, 5.2 | Missing retry / silent error swallowing |
| Medium | 4.1, 4.2 | Inoreader token expiry breaks silently |
| Medium | 6.7 | HTTP inside DB transaction risks connection pool exhaustion |
| Low | 1.2, 1.3, 2.1, 3.5, 5.5, 6.3, 6.4, 6.5 | Unused imports, cleanup |
| Low | 6.8 | Dead RSS feed URLs waste health check cycles |
