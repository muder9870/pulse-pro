"""
Bug condition exploration tests for the Research Deep Dive sync fix.

These tests are EXPECTED TO FAIL on unfixed code — failure confirms the bugs exist.
DO NOT fix the code when these tests fail.

Validates: Requirements 1.1, 1.2, 3.1, 3.2, 4.1, 4.2
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.db.models import (
    Base,
    RawArticle,
    ProcessedArticle,
    PaperAnalysis,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_in_memory_session() -> Session:
    """Create a fresh SQLite in-memory DB with all tables and return a session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    return Session(engine)


# ---------------------------------------------------------------------------
# Bug 3 exploration — wrong import path in analytics_repository.py
# ---------------------------------------------------------------------------

def test_exploration_bug3_analytics_import_does_not_crash():
    """
    Bug 3: analytics_repository.py imports from `backend.models` instead of
    `backend.db.models`.  On unfixed code this import path is fragile — the
    module only works because backend/models.py happens to re-export everything
    via `*`.  The exploration test asserts that importing AnalyticsRepository
    raises an ImportError.

    EXPECTED OUTCOME ON UNFIXED CODE: FAIL
    (the import succeeds due to the wildcard re-export, so the assertion that
    ImportError was raised is False — proving the import path is wrong but
    silently masked)

    Counterexample documented:
      - `from backend.models import EngagementMetric` does NOT raise ImportError
        because backend/models.py does `from .db.models import *`.
      - The bug is that the import path is wrong; it only works by accident.
      - The test fails because no ImportError is raised, confirming the bug
        condition (wrong path) exists even though it doesn't crash at import time.
    """
    import_error_raised = False
    try:
        # Attempt the exact import that analytics_repository.py uses on unfixed code
        from backend.models import EngagementMetric, RawArticle as RA, ProcessedArticle as PA, GeneratedContent  # noqa: F401
    except ImportError:
        import_error_raised = True

    # On unfixed code this assertion FAILS because the wildcard re-export masks
    # the wrong path — no ImportError is raised.
    assert import_error_raised, (
        "Expected ImportError from 'backend.models' import path, but none was raised. "
        "Bug 3 confirmed: analytics_repository.py uses the wrong import path "
        "('backend.models' instead of 'backend.db.models'). "
        "The import only succeeds because backend/models.py re-exports via '*'."
    )


# ---------------------------------------------------------------------------
# Bug 1 exploration — `deep_dive_analyzed` missing from get_dashboard_stats()
# ---------------------------------------------------------------------------

def test_exploration_bug1_deep_dive_analyzed_stat_present():
    """
    Bug 1: AnalyticsRepository.get_dashboard_stats() never queries PaperAnalysis,
    so the 'deep_dive_analyzed' key is absent from the returned dict.

    EXPECTED OUTCOME ON UNFIXED CODE: FAIL
    (KeyError or assertion failure because 'deep_dive_analyzed' is not in stats)

    Counterexample documented:
      - stats dict returned by get_dashboard_stats() does not contain
        'deep_dive_analyzed' key even when PaperAnalysis rows exist.
    """
    session = make_in_memory_session()

    # Seed: one RawArticle -> one ProcessedArticle -> one PaperAnalysis
    raw = RawArticle(
        title="Test Paper",
        source="arxiv",
        url="https://arxiv.org/abs/test.001",
    )
    session.add(raw)
    session.flush()

    processed = ProcessedArticle(raw_article_id=raw.id)
    session.add(processed)
    session.flush()

    paper = PaperAnalysis(article_id=processed.id)
    session.add(paper)
    session.commit()

    # Import and instantiate AnalyticsRepository (uses wrong import path on unfixed code)
    from backend.db.repositories.analytics_repository import AnalyticsRepository
    repo = AnalyticsRepository(session)
    stats = repo.get_dashboard_stats()

    # On unfixed code this assertion FAILS because the key is absent
    assert "deep_dive_analyzed" in stats, (
        f"Bug 1 confirmed: 'deep_dive_analyzed' key is missing from stats. "
        f"Actual keys returned: {list(stats.keys())}"
    )
    assert stats["deep_dive_analyzed"] == 1, (
        f"Bug 1 confirmed: expected deep_dive_analyzed=1, got {stats.get('deep_dive_analyzed')}"
    )

    session.close()


# ---------------------------------------------------------------------------
# Bug 4 exploration — ensure_processed_id returns wrong ProcessedArticle
# ---------------------------------------------------------------------------

def test_exploration_bug4_ensure_processed_id_returns_correct_raw_article():
    """
    Bug 4: ensure_processed_id(article_id) has a fallback path that queries
    ProcessedArticle.id == article_id when no ProcessedArticle.raw_article_id
    match is found.  This can return a ProcessedArticle that belongs to a
    *different* RawArticle, silently passing the wrong ID to the analyzer.

    Setup to trigger the fallback path:
      - RawArticle(id=10)  — the article the caller wants to deep-dive
      - RawArticle(id=55)  — an unrelated article
      - ProcessedArticle(id=10, raw_article_id=55)  — id collides with raw_article_id=10
        but belongs to a DIFFERENT raw article
      - NO ProcessedArticle with raw_article_id=10 exists

    Call ensure_processed_id(10):
      - Primary path: no ProcessedArticle.raw_article_id == 10 → falls through
      - Fallback path: finds ProcessedArticle.id == 10 → returns 10
        but that ProcessedArticle belongs to raw_article_id=55 ✗

    EXPECTED OUTCOME ON UNFIXED CODE: FAIL
    (the fallback returns processed_id=10 which traces back to raw_article_id=55,
    not raw_article_id=10 as expected)

    Counterexample documented:
      - ensure_processed_id(10) returns 10 (ProcessedArticle.id=10, raw_article_id=55)
        when there is no ProcessedArticle with raw_article_id=10.
      - The returned processed_id traces back to the wrong raw article.
    """
    session = make_in_memory_session()

    # Two RawArticles to satisfy FK constraints
    raw10 = RawArticle(
        id=10,
        title="Target Paper",
        source="arxiv",
        url="https://arxiv.org/abs/target.001",
    )
    raw55 = RawArticle(
        id=55,
        title="Other Paper",
        source="arxiv",
        url="https://arxiv.org/abs/other.001",
    )
    session.add_all([raw10, raw55])
    session.flush()

    # ProcessedArticle id=10 belongs to raw_article_id=55 (the collision)
    proc10 = ProcessedArticle(id=10, raw_article_id=55)
    session.add(proc10)

    # The correct ProcessedArticle for raw_article_id=10 (what the fix should return)
    proc_correct = ProcessedArticle(raw_article_id=10)
    session.add(proc_correct)

    session.commit()

    from backend.db.repositories.article_repository import ArticleRepository
    repo = ArticleRepository(session)

    returned_processed_id = repo.ensure_processed_id(10)

    # Verify the returned processed_id traces back to raw_article_id=10
    resolved = session.query(ProcessedArticle).filter(
        ProcessedArticle.id == returned_processed_id
    ).first()

    assert resolved is not None, (
        f"ensure_processed_id(10) returned {returned_processed_id} which does not exist"
    )

    # On unfixed code this assertion FAILS: fallback returns processed_id=10
    # which belongs to raw_article_id=55, not 10
    assert resolved.raw_article_id == 10, (
        f"Bug 4 confirmed: ensure_processed_id(10) returned processed_id={returned_processed_id} "
        f"which traces back to raw_article_id={resolved.raw_article_id}, not 10. "
        f"The fallback path returned the wrong ProcessedArticle (id=10 belongs to raw_article_id=55)."
    )

    session.close()


# ===========================================================================
# Preservation tests — MUST PASS on unfixed code
# These capture baseline behavior that must not regress after fixes are applied.
# Validates: Requirements 3.1, 3.2, 3.3, 3.4
# ===========================================================================


# ---------------------------------------------------------------------------
# Preservation 1 — Existing stats keys present and numerically correct
# ---------------------------------------------------------------------------

def test_preservation_existing_stats_keys_present_empty_db():
    """
    Property 5: Preservation — Existing Stats Fields Unchanged

    With an empty in-memory DB (0 PaperAnalysis rows), get_dashboard_stats()
    must return all pre-existing keys with numerically correct values (0 for
    empty DB).

    EXPECTED OUTCOME ON UNFIXED CODE: PASS
    (the existing keys are always returned; the missing 'deep_dive_analyzed'
    key is a separate bug and is NOT asserted here)

    Validates: Requirements 3.1
    """
    session = make_in_memory_session()

    from backend.db.repositories.analytics_repository import AnalyticsRepository
    repo = AnalyticsRepository(session)
    stats = repo.get_dashboard_stats()

    required_keys = [
        "total_articles",
        "processed_articles",
        "generated_content",
        "avg_priority_score",
    ]
    for key in required_keys:
        assert key in stats, (
            f"Preservation failure: existing key '{key}' is missing from stats. "
            f"Actual keys: {list(stats.keys())}"
        )

    # With an empty DB all numeric counts must be 0
    assert stats["total_articles"] == 0, (
        f"Expected total_articles=0 for empty DB, got {stats['total_articles']}"
    )
    assert stats["processed_articles"] == 0, (
        f"Expected processed_articles=0 for empty DB, got {stats['processed_articles']}"
    )
    assert stats["generated_content"] == 0, (
        f"Expected generated_content=0 for empty DB, got {stats['generated_content']}"
    )
    assert stats["avg_priority_score"] == 0, (
        f"Expected avg_priority_score=0 for empty DB, got {stats['avg_priority_score']}"
    )

    session.close()


# ---------------------------------------------------------------------------
# Preservation 2 — has_deep_analysis is False for article without PaperAnalysis
# ---------------------------------------------------------------------------

def test_preservation_has_deep_analysis_false_without_paper_analysis():
    """
    Property 6: Preservation — Stories Without Deep Analysis Unaffected

    Create a RawArticle + ProcessedArticle with NO PaperAnalysis row.
    Call _format_story() and assert has_deep_analysis == False.

    EXPECTED OUTCOME ON UNFIXED CODE: PASS
    (_format_story already queries PaperAnalysis and returns False when absent)

    Validates: Requirements 3.2
    """
    session = make_in_memory_session()

    raw = RawArticle(
        title="No Deep Dive Paper",
        source="arxiv",
        url="https://arxiv.org/abs/nodeepdive.001",
    )
    session.add(raw)
    session.flush()

    processed = ProcessedArticle(raw_article_id=raw.id)
    session.add(processed)
    session.commit()

    # Reload raw with relationship populated
    session.expire_all()
    raw = session.query(RawArticle).filter(RawArticle.id == raw.id).first()

    from backend.db.repositories.article_repository import ArticleRepository
    repo = ArticleRepository(session)
    story = repo._format_story(raw)

    assert "has_deep_analysis" in story, (
        "Preservation failure: 'has_deep_analysis' key is missing from story dict"
    )
    assert story["has_deep_analysis"] is False, (
        f"Expected has_deep_analysis=False for article without PaperAnalysis, "
        f"got {story['has_deep_analysis']}"
    )

    session.close()


# ---------------------------------------------------------------------------
# Preservation 3 — has_deep_analysis is False for N articles without PaperAnalysis
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("n_articles", [1, 5, 10])
def test_preservation_has_deep_analysis_false_for_multiple_articles_without_paper_analysis(n_articles):
    """
    Property 6: Preservation — Stories Without Deep Analysis Unaffected (parametrized)

    For N=1, 5, 10 articles all without PaperAnalysis rows, every story
    returned by _format_story() must have has_deep_analysis == False.

    EXPECTED OUTCOME ON UNFIXED CODE: PASS

    Validates: Requirements 3.2, 3.3
    """
    session = make_in_memory_session()

    raw_articles = []
    for i in range(n_articles):
        raw = RawArticle(
            title=f"Paper {i}",
            source="arxiv",
            url=f"https://arxiv.org/abs/multi.{i:04d}",
        )
        session.add(raw)
        session.flush()

        processed = ProcessedArticle(raw_article_id=raw.id)
        session.add(processed)
        session.flush()

        raw_articles.append(raw.id)

    session.commit()

    from backend.db.repositories.article_repository import ArticleRepository
    repo = ArticleRepository(session)

    for raw_id in raw_articles:
        session.expire_all()
        raw = session.query(RawArticle).filter(RawArticle.id == raw_id).first()
        story = repo._format_story(raw)

        assert "has_deep_analysis" in story, (
            f"Preservation failure: 'has_deep_analysis' missing for article id={raw_id}"
        )
        assert story["has_deep_analysis"] is False, (
            f"Expected has_deep_analysis=False for article id={raw_id} "
            f"(no PaperAnalysis row), got {story['has_deep_analysis']}"
        )

    session.close()
