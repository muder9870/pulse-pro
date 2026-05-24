from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from typing import Any, Dict, List

from sqlalchemy import update as sql_update, func
from sqlalchemy.dialects.postgresql import insert

from backend.db.session import get_session
from backend.llm.llm_router import smart_router, Task
from backend.llm.base_provider import RateLimitError, RetryLaterError
from backend.llm.circuit_breaker import CircuitBreakerError
from ..models import RawArticle, ProcessedArticle
from ..schemas import ArticleAnalysis
from ..config import settings
from datetime import datetime, timedelta, timezone


ANALYSIS_PROMPT_TEMPLATE = """You are an AI assistant that analyzes AI/ML news articles and research papers.

Given the ARTICLE below, produce a JSON object with this EXACT schema:
{{
  "summary": "Short 2-sentence summary.",
  "viral_hook": "A catchy, viral-style hook (1-2 sentences).",
  "key_innovation": "The core technical or research innovation.",
  "implication": "The major impact or implication of this work.",
  "key_takeaways": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "category": "One of: LLM, Computer Vision, NLP, Robotics, General AI, Other",
  "sentiment": "One of: Positive, Neutral, Negative",
  "tags": ["tag1", "tag2"]
}}

ARTICLE TITLE:
{title}

ARTICLE TEXT (may be partial):
{text}

Return ONLY valid JSON, no preamble or extra text.
"""

# Template used when LLM is unavailable or times out
FALLBACK_RESULT: Dict[str, Any] = {
    "summary": "",
    "viral_hook": "",
    "key_innovation": "",
    "implication": "",
    "key_takeaways": [],
    "category": "Other",
    "sentiment": "Neutral",
    "tags": []
}

# Hard cap on a single LLM call (seconds). Increase for slower hardware.
LLM_CALL_TIMEOUT_SECONDS = 90


def wait_for_raw_analysis_complete(
    raw_ids: list[int],
    *,
    poll_seconds: float = 2.0,
    timeout_seconds: float | None = None,
) -> None:
    """Block until Celery workers finish analysis for these raw article IDs.

    Scoring/priority steps require ``RawArticle.state == 'analyzed'`` (or terminal
    failure). Without this wait, ``score_all_articles`` runs while rows are still
    ``analyzing``, which yields "Scored 0 and prioritized 0".
    """
    if not raw_ids:
        return

    log = logging.getLogger("analyzer")
    timeout = (
        timeout_seconds
        if timeout_seconds is not None
        else float(os.getenv("ANALYSIS_WAIT_TIMEOUT_SECONDS", "7200"))
    )
    terminal = ("analyzed", "generated", "published", "analysis_failed")
    deadline = time.monotonic() + timeout
    pending: list[int] = list(raw_ids)

    log.info("analysis_wait_start ids=%d timeout_s=%s", len(raw_ids), timeout)

    while time.monotonic() < deadline:
        with get_session() as session:
            rows = session.query(RawArticle.id, RawArticle.state).filter(
                RawArticle.id.in_(pending)
            ).all()
        state_by_id = {rid: st for rid, st in rows}
        missing_ids = [rid for rid in pending if rid not in state_by_id]
        if missing_ids:
            # If a row was removed between enqueue and wait, do not block pipeline forever.
            log.warning(
                "analysis_wait_missing_rows count=%d sample=%s",
                len(missing_ids),
                missing_ids[:10],
            )
        pending = [
            rid for rid in pending
            if rid in state_by_id and state_by_id.get(rid) not in terminal
        ]
        if not pending:
            log.info("analysis_wait_done ids=%d", len(raw_ids))
            return
        time.sleep(poll_seconds)

    raise TimeoutError(
        f"Timed out after {timeout}s waiting for analysis; still pending: "
        f"{pending[:30]}{'...' if len(pending) > 30 else ''}"
    )


class ArticleAnalyzer:
    def __init__(self) -> None:
        self.router = smart_router
        self.log = logging.getLogger("analyzer")

    def analyze_all_articles(self, limit: int | None = None) -> tuple[int, list[int]]:
        """Enqueue analysis tasks for unprocessed articles.

        Returns (enqueued_count, raw_article_ids) so callers can wait for Celery
        before scoring.
        """
        # Read candidates
        with get_session() as session:
            now = datetime.now(timezone.utc)
            query = session.query(RawArticle.id).filter(
                RawArticle.state == "deduped",
                (RawArticle.retry_after == None) | (RawArticle.retry_after <= now)
            ).order_by(
                (RawArticle.source == "arxiv").desc(),
                RawArticle.fetched_at.desc()
            )
            
            if limit is not None:
                query = query.limit(limit)
            
            rows = query.all()
        
        if not rows:
            self.log.info("analyzer_no_pending_articles")
            return 0, []

        raw_ids = [row.id for row in rows]
        self.log.info("analyzer_enqueue total=%d limit=%s", len(rows), limit)
        enqueued = 0

        for row in rows:
            try:
                # Enqueue task
                from backend.tasks import process_article
                import uuid
                correlation_id = str(uuid.uuid4())
                process_article.delay(row.id, correlation_id, time.time())
                enqueued += 1
            except Exception as exc:
                self.log.error("enqueue_error article_id=%s %s", row.id, exc)

        self.log.info("analyzer_enqueued total=%d", enqueued)
        return enqueued, raw_ids

    def process_single_article(self, row_id: int, prefer_primary_retry: bool = False) -> int | None:
        """Analyze a single article on demand. Returns ProcessedArticle.id."""
        correlation_id = str(uuid.uuid4())
        self.log.info("process_start article_id=%s correlation_id=%s prefer_primary_retry=%s", row_id, correlation_id, prefer_primary_retry)
        with get_session() as session:
            # Get article for processing (rely on idempotency for locking)
            raw = session.query(RawArticle).filter(RawArticle.id == row_id).first()
            if not raw:
                self.log.error("article_not_found id=%s", row_id)
                return None
            
            # Check state after lock (Celery pre-sets "analyzing" before calling us)
            if raw.state not in ["deduped", "pending", "analysis_failed", "analyzing"]:
                if raw.processed:
                    processed = session.query(ProcessedArticle.id).filter(ProcessedArticle.raw_article_id == row_id).first()
                    return processed[0] if processed else None
                return None
            
            # Claim the article (skip if already analyzing from Celery)
            if raw.state != "analyzing":
                raw.state = "analyzing"
                session.commit()
            
            title = raw.title
            raw_content = raw.raw_content

        # ── LLM Call (no DB connection held) ──
        start = time.monotonic()
        try:
            analysis_data = self._analyze_single_article_with_timeout(title, raw_content or "", prefer_primary_retry=prefer_primary_retry)
            result = analysis_data["result"]
            raw_out = analysis_data["raw_output"]
            val_err = analysis_data["validation_error"]
            llm_fallback = result.get("_fallback", False)
            
            from ..metrics import metrics
            metrics.increment("articles_analyzed_total")
            if llm_fallback:
                metrics.increment("articles_fallback_total")
            
            # ── Save Result ──
            p_id = self._save_analysis(
                row_id, 
                result, 
                llm_fallback=llm_fallback,
                llm_raw_output=raw_out,
                llm_validation_error=val_err
            )
            
            duration_ms = int((time.monotonic() - start) * 1000)
            self.log.info(
                "analyzed article_id=%s correlation_id=%s title=%r duration_ms=%d fallback=%s",
                row_id, correlation_id, (title or "")[:60], duration_ms, llm_fallback,
            )
            return p_id
            
        except RetryLaterError as exc:
            self.log.warning(
                "retry_later article_id=%s correlation_id=%s retry_after=%s",
                row_id, correlation_id, exc.retry_after
            )
            self._mark_for_retry(row_id, "retry_later")
            raise
        except RateLimitError as exc:
            self.log.warning(
                "rate_limit article_id=%s correlation_id=%s retry_after=%s",
                row_id, correlation_id, exc.retry_after
            )
            self._mark_for_retry(row_id, "rate_limit")
            raise
        except CircuitBreakerError as exc:
            self.log.warning("circuit_breaker_active article_id=%s correlation_id=%s — reverting state", row_id, correlation_id)
            with get_session() as session:
                raw = session.get(RawArticle, row_id)
                if raw:
                    raw.state = "deduped"
            raise
        except Exception as exc:
            self.log.error("analysis_failed article_id=%s correlation_id=%s error=%s", row_id, correlation_id, exc)
            self._mark_for_retry(row_id, str(type(exc).__name__))
            raise

    def _analyze_single_article_with_timeout(
        self, title: str, raw_content: str, prefer_primary_retry: bool = False
    ) -> Dict[str, Any]:
        """Call LLM with a wall-clock timeout guard."""
        import threading

        result_box: list[Dict[str, Any]] = []
        error_box: list[Exception] = []

        def target() -> None:
            try:
                result_box.append(self._analyze_single_article(title, raw_content, prefer_primary_retry=prefer_primary_retry))
            except Exception as exc:
                error_box.append(exc)

        t = threading.Thread(target=target, daemon=True)
        t.start()
        t.join(timeout=LLM_CALL_TIMEOUT_SECONDS)

        if t.is_alive():
            self.log.warning(
                "llm_timeout article_title=%r timeout_s=%d — using fallback",
                (title or "")[:60],
                LLM_CALL_TIMEOUT_SECONDS,
            )
            fallback = dict(FALLBACK_RESULT)
            fallback["_fallback"] = True
            return {
                "result": fallback,
                "raw_output": "TIMEOUT",
                "validation_error": "LLM call timed out after 90s"
            }

        if error_box:
            raise error_box[0]

        return result_box[0]

    def _analyze_single_article(self, title: str, raw_content: str, prefer_primary_retry: bool = False) -> Dict[str, Any]:
        """Call LLM, parse, validate, and optionally repair with retries."""
        text = raw_content or ""
        if not text:
            text = title
        if len(text) > 8000:
            text = text[:8000]

        prompt = ANALYSIS_PROMPT_TEMPLATE.format(title=title, text=text)
        
        # Retry LLM call up to 3 times if validation fails
        for attempt in range(3):
            try:
                llm_out = self.router.generate(prompt, max_tokens=512, task=Task.ANALYSIS, prefer_primary_retry=prefer_primary_retry)
                
                if hasattr(llm_out, "retry_after") and llm_out.retry_after is not None:
                    raise RetryLaterError(
                        message="Retry later per provider instructions",
                        retry_after=llm_out.retry_after
                    )

                raw_output = llm_out.content
                provider = llm_out.provider

                # Validation Phase
                result = self._validate_and_parse(raw_output)
                result["provider"] = provider
                # Mark whether this response was produced by a fallback provider
                result["_fallback"] = bool(getattr(llm_out, "fallback", False))
                
                # Step 2: Self-Critique Loop (Phase 3)
                res_data = result["result"]
                total_score = (res_data.get("viral_score", 0) or 0) + (res_data.get("tech_score", 0) or 0)
                
                if total_score > 120 or len(res_data.get("summary", "")) > 600:
                    self.log.info("self_critique_triggered article_title=%r score=%d", title[:60], total_score)
                    critique_prompt = (
                        f"CRITIQUE AND REFINE this analysis of '{title}'.\n"
                        f"Make it sharper, more professional, and ensure the 'viral_hook' is absolutely standout.\n\n"
                        f"Original Analysis:\n{res_data}\n\n"
                        f"Return the REFINED and final JSON object matching the original schema."
                    )
                    try:
                        refined_llm = self.router.generate(critique_prompt, max_tokens=512, task=Task.ANALYSIS)
                        refined_parsed = self._validate_and_parse(refined_llm.content)
                        refined_parsed["_fallback"] = bool(getattr(refined_llm, "fallback", False))
                        return refined_parsed
                    except Exception as e:
                        self.log.warning("self_critique_failed error=%s — using original result", e)
                        return result
                
                return result
            except Exception as e:
                self.log.warning("llm_attempt_failed attempt=%d error=%s", attempt + 1, e)
                if attempt == 2:
                    # After 3 attempts, use fallback
                    fallback = dict(FALLBACK_RESULT)
                    fallback["_fallback"] = True
                    return {
                        "result": fallback,
                        "raw_output": f"LLM failed after 3 attempts: {str(e)}",
                        "validation_error": str(e)
                    }

    def _mark_for_retry(self, row_id: int, error_type: str) -> None:
        """Increment retry count and schedule next attempt with backoff."""
        with get_session() as session:
            raw = session.get(RawArticle, row_id)
            if not raw:
                return
            
            raw.retry_count += 1
            if raw.retry_count >= settings.MAX_RETRIES:
                raw.state = "analysis_failed"
                self.log.error(
                    "analysis_perm_failed article_id=%s retry_count=%d",
                    row_id, raw.retry_count
                )
            else:
                # Backoff: 5, 10, 15, 20, 25, 30... capped at 30 mins
                delay_mins = min(5 * raw.retry_count, 30)
                raw.retry_after = datetime.now(timezone.utc) + timedelta(minutes=delay_mins)
                raw.state = "deduped"
                self.log.info(
                    "analysis_retry article_id=%s error=%s retry_count=%d retry_after=%s",
                    row_id, error_type, raw.retry_count, raw.retry_after.isoformat()
                )
            # Persist retry counters + state.
            session.commit()

    def _validate_and_parse(self, output_text: str) -> Dict[str, Any]:
        """Helper to parse JSON and validate against Pydantic schema."""
        parsed_dict = self._parse_json(output_text)
        
        CATEGORY_MAP = {
            "General": "General AI",
            "AI": "General AI",
            "General Artificial Intelligence": "General AI",
        }
        if isinstance(parsed_dict.get("category"), str):
            parsed_dict["category"] = CATEGORY_MAP.get(parsed_dict["category"], parsed_dict["category"])
        
        # ArticleAnalysis will throw ValidationError if structure is wrong
        validated = ArticleAnalysis.model_validate(parsed_dict)
        return {
            "result": validated.model_dump(),
            "raw_output": output_text,
            "validation_error": None
        }

    def _save_analysis(
        self,
        raw_id: int,
        result: Dict[str, Any],
        llm_fallback: bool = False,
        llm_raw_output: str | None = None,
        llm_validation_error: str | None = None,
    ) -> int:
        """Persist analysis to DB using PostgreSQL UPSERT for atomicity.

        Returns ProcessedArticle.id.
        """
        from ..models import ArticleTag

        summary            = result.get("summary") or ""
        viral_hook         = result.get("viral_hook") or ""
        key_innovation     = result.get("key_innovation") or ""
        implication        = result.get("implication") or ""
        key_takeaways_list: List[str] = result.get("key_takeaways") or []
        category           = result.get("category") or "Other"
        sentiment          = result.get("sentiment") or "Neutral"
        tags_list: List[str] = result.get("tags") or []

        key_takeaways_str = (
            "\n- " + "\n- ".join(key_takeaways_list) if key_takeaways_list else ""
        )

        with get_session() as session:
            # UPSERT ProcessedArticle
            upsert_stmt = insert(ProcessedArticle).values(
                raw_article_id=raw_id,
                summary=summary,
                viral_hook=viral_hook,
                key_innovation=key_innovation,
                implication=implication,
                key_takeaways=key_takeaways_str,
                sentiment=sentiment,
                category=category,
                llm_raw_output=llm_raw_output,
                llm_validation_error=llm_validation_error,
                llm_fallback=1 if llm_fallback else 0,
            ).on_conflict_do_update(
                index_elements=['raw_article_id'],
                set_=dict(
                    summary=summary,
                    viral_hook=viral_hook,
                    key_innovation=key_innovation,
                    implication=implication,
                    key_takeaways=key_takeaways_str,
                    sentiment=sentiment,
                    category=category,
                    llm_raw_output=llm_raw_output,
                    llm_validation_error=llm_validation_error,
                    llm_fallback=1 if llm_fallback else 0,
                    processed_at=func.now()
                )
            )
            session.execute(upsert_stmt)
            
            # Get the ID
            processed = session.query(ProcessedArticle).filter(ProcessedArticle.raw_article_id == raw_id).first()
            if not processed:
                raise RuntimeError(f"Failed to upsert ProcessedArticle for raw_id {raw_id}")
            
            # Re-sync tags
            session.query(ArticleTag).filter(
                ArticleTag.article_id == processed.id
            ).delete(synchronize_session=False)
            for tag_name in tags_list:
                if tag_name:
                    session.add(ArticleTag(article_id=processed.id, tag=tag_name))

            # Update RawArticle state
            raw = session.get(RawArticle, raw_id)
            if raw:
                raw.processed = 1
                raw.state = "analyzed"

            session.commit()
            self.log.info("analysis_saved article_id=%s processed_id=%s", raw_id, processed.id)
            return processed.id

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Robustly parse JSON from LLM output.

        Handles common cases:
        - fenced blocks like ```json { ... } ```
        - extra text before/after the JSON
        - partial truncation (best-effort extraction)
        """
        debug = str(os.getenv("DEBUG_PIPELINE", "")).lower() in {"1", "true", "yes"}

        raw = text.strip()

        # Strip markdown fences anywhere in the output.
        # We intentionally keep the JSON payload intact.
        cleaned = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE)
        cleaned = cleaned.replace("```", "").strip()

        # Extract the JSON object using the outermost braces.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        candidate = cleaned[start : end + 1] if start != -1 and end != -1 and end > start else cleaned

        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            if debug:
                self.log.warning(
                    "json_parse_failed error=%s candidate_prefix=%r",
                    exc,
                    candidate[:200],
                )
            # Never fail the whole pipeline on parse issues.
            # Returning a schema-safe fallback keeps the stage moving.
            return dict(FALLBACK_RESULT)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    analyzer = ArticleAnalyzer()
    n, ids = analyzer.analyze_all_articles()
    logging.getLogger("analyzer").info("enqueued=%s raw_ids=%s", n, len(ids))


if __name__ == "__main__":
    main()
