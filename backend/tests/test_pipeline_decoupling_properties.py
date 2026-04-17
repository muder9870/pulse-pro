# Feature: pipeline-content-decoupling, Property 3: analysis limit respected
"""
Property-based tests for the pipeline/content decoupling feature.

Property 3: Analysis limit is respected
  For any positive integer N and M > N articles in `deduped` state, the
  AnalysisAgent SHALL analyze exactly N articles (i.e. pass limit=N to
  analyzer.analyze_all_articles).

Validates: Requirements 2.1, 2.3
"""
import sys
import types
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Module-level stubs so backend.agents.analysis_agent can be imported
# without the full dependency chain (pybreaker, sqlalchemy, etc.)
# ---------------------------------------------------------------------------

def _install_stubs():
    """Inject minimal stubs for heavy dependencies before importing the agent."""
    stubs = {
        "pybreaker": types.ModuleType("pybreaker"),
        "sqlalchemy": types.ModuleType("sqlalchemy"),
        "sqlalchemy.orm": types.ModuleType("sqlalchemy.orm"),
        "redis": types.ModuleType("redis"),
        "celery": types.ModuleType("celery"),
        "backend.db.session": types.ModuleType("backend.db.session"),
        "backend.processors.cleaner": types.ModuleType("backend.processors.cleaner"),
        "backend.processors.deduplicator": types.ModuleType("backend.processors.deduplicator"),
        "backend.processors.analyzer": types.ModuleType("backend.processors.analyzer"),
        "backend.processors.scorer": types.ModuleType("backend.processors.scorer"),
        "backend.processors.decision_engine": types.ModuleType("backend.processors.decision_engine"),
        "backend.generators.tag_generator": types.ModuleType("backend.generators.tag_generator"),
        "backend.agents.base_agent": types.ModuleType("backend.agents.base_agent"),
    }
    # Provide the symbols the agent module actually imports
    stubs["backend.processors.cleaner"].Cleaner = MagicMock
    stubs["backend.processors.deduplicator"].Deduplicator = MagicMock
    stubs["backend.processors.analyzer"].ArticleAnalyzer = MagicMock
    stubs["backend.processors.analyzer"].wait_for_raw_analysis_complete = MagicMock()
    stubs["backend.processors.scorer"].score_all_articles = MagicMock(return_value=0)
    stubs["backend.processors.decision_engine"].decision_engine = MagicMock()
    stubs["backend.generators.tag_generator"].generate_tags_for_article = MagicMock()

    class _BaseAgent:
        def __init__(self, name, db):
            self.name = name
            self.db = db
        def log(self, msg):
            pass

    stubs["backend.agents.base_agent"].BaseAgent = _BaseAgent

    for name, mod in stubs.items():
        if name not in sys.modules:
            sys.modules[name] = mod


_install_stubs()

# Now safe to import
from backend.agents.analysis_agent import AnalysisAgent  # noqa: E402


# ---------------------------------------------------------------------------
# Property 3 — Analysis limit is respected
# ---------------------------------------------------------------------------

@settings(max_examples=25)
@given(
    n=st.integers(min_value=1, max_value=500),
    extra=st.integers(min_value=1, max_value=500),
)
def test_property3_analysis_limit_respected(n: int, extra: int):
    """**Validates: Requirements 2.1, 2.3**

    For any positive integer N and M = N + extra articles in `deduped` state,
    AnalysisAgent.run(limit=N) must call analyzer.analyze_all_articles with
    limit=N — never None, never a different value.
    """
    agent = AnalysisAgent(MagicMock())

    agent.cleaner = MagicMock()
    agent.cleaner.clean_all_articles.return_value = 0
    agent.deduplicator = MagicMock()
    agent.deduplicator.deduplicate_articles.return_value = 0

    raw_ids = list(range(1, n + 1))
    agent.analyzer = MagicMock()
    agent.analyzer.analyze_all_articles.return_value = (n, raw_ids)

    with patch("backend.agents.analysis_agent.score_all_articles", return_value=0), \
         patch("backend.agents.analysis_agent.decision_engine"), \
         patch("backend.agents.analysis_agent.wait_for_raw_analysis_complete"), \
         patch.dict("os.environ", {"ANALYSIS_SKIP_WAIT": "1"}):
        agent.run(limit=n)

    agent.analyzer.analyze_all_articles.assert_called_once()
    call_kwargs = agent.analyzer.analyze_all_articles.call_args

    actual_limit = call_kwargs.args[0] if call_kwargs.args else call_kwargs.kwargs.get("limit")

    assert actual_limit == n, (
        f"Expected analyze_all_articles(limit={n}), got limit={actual_limit!r}. (N={n}, M={n + extra})"
    )
    assert actual_limit is not None, (
        f"analyze_all_articles called with limit=None when limit={n} was requested."
    )
