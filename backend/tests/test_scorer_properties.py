# Feature: pipeline-content-decoupling, Property 4: keyword score pure function
# Feature: pipeline-content-decoupling, Property 5: relevance score capped at 100
# Feature: pipeline-content-decoupling, Property 6: case-insensitive substring
"""
Property-based tests for keyword scoring in ArticleScorer.

Property 4: Keyword score is a pure function of match count
Property 5: Relevance score is capped at 100
Property 6: Keyword matching is case-insensitive substring

Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7
"""
import sys
import types
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Minimal stubs — installed before any backend import
# ---------------------------------------------------------------------------

def _stub(name):
    m = types.ModuleType(name)
    sys.modules.setdefault(name, m)
    return sys.modules[name]


# sqlalchemy stubs
_sa = _stub("sqlalchemy")
_sa.update = MagicMock(return_value=MagicMock())
_sa.func = MagicMock()
_sa.or_ = MagicMock()
_sa.String = MagicMock()
_sa.Integer = MagicMock()
_sa.DateTime = MagicMock()
_sa.Float = MagicMock()
_sa.Boolean = MagicMock()
_sa.Text = MagicMock()
_sa.ForeignKey = MagicMock()
_sa.UniqueConstraint = MagicMock()
_sa.Index = MagicMock()
_sa.Table = MagicMock()
_sa.REAL = MagicMock()
_sa.Column = MagicMock()

_sa_orm = _stub("sqlalchemy.orm")
_sa_orm.DeclarativeBase = object
_sa_orm.Mapped = MagicMock()
_sa_orm.mapped_column = MagicMock()
_sa_orm.relationship = MagicMock()
_sa_orm.Session = MagicMock()

_sa_sql = _stub("sqlalchemy.sql")
_sa_sql.func = MagicMock()

_stub("pybreaker")
_stub("redis")

# backend.db.session stub
_db_session = _stub("backend.db.session")

@contextmanager
def _fake_get_session():
    s = MagicMock()
    s.query.return_value.all.return_value = []
    s.query.return_value.filter.return_value.scalar.return_value = 0
    yield s

_db_session.get_session = _fake_get_session
_db_session.SessionLocal = MagicMock
_db_session.init_db = MagicMock()

# backend.models stub (scorer uses relative `from ..models import ...`)
_models = _stub("backend.models")
for _attr in ("ProcessedArticle", "RawArticle", "UserPreference", "UserFeedback", "GeneratedContent"):
    setattr(_models, _attr, MagicMock())

# Make backend.processors a real package so scorer.py can be imported
import importlib, os as _os
_backend_pkg = _stub("backend")
_backend_pkg.__path__ = [_os.path.join(_os.path.dirname(__file__), "..", "..")]
_proc_pkg = _stub("backend.processors")
_proc_pkg.__path__ = [_os.path.join(_os.path.dirname(__file__), "..", "processors")]

# Now import scorer — its module-level code runs with stubs in place
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location(
    "backend.processors.scorer",
    _os.path.join(_os.path.dirname(__file__), "..", "processors", "scorer.py"),
)
_scorer_mod = _ilu.module_from_spec(_spec)
sys.modules["backend.processors.scorer"] = _scorer_mod
_spec.loader.exec_module(_scorer_mod)

ArticleScorer = _scorer_mod.ArticleScorer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

STEP_MAP = {0: 0, 1: 10, 2: 20, 3: 25}


def _expected_boost(n: int) -> int:
    return STEP_MAP.get(n, 30)  # 4+ → 30


# ---------------------------------------------------------------------------
# Property 4 — Keyword score is a pure function of match count
# ---------------------------------------------------------------------------

@settings(max_examples=25)
@given(
    keywords=st.lists(
        st.text(alphabet=st.characters(whitelist_categories=("Ll",)), min_size=3, max_size=12),
        min_size=1, max_size=10, unique=True,
    ),
    match_count=st.integers(min_value=0, max_value=6),
)
def test_property4_keyword_boost_pure_function(keywords, match_count):
    """Validates: Requirements 3.1, 3.2, 3.3, 3.4"""
    scorer = ArticleScorer()
    actual = min(match_count, len(keywords))
    text = " ".join(keywords[:actual])

    boost = scorer.calculate_keyword_boost("", text, keywords)

    assert boost == _expected_boost(actual), (
        f"match_count={actual}, expected={_expected_boost(actual)}, got={boost}"
    )


# ---------------------------------------------------------------------------
# Property 5 — Relevance score is capped at 100
# ---------------------------------------------------------------------------

@settings(max_examples=25)
@given(
    keywords=st.lists(
        st.text(alphabet=st.characters(whitelist_categories=("Ll",)), min_size=3, max_size=10),
        min_size=0, max_size=8, unique=True,
    ),
    match_count=st.integers(min_value=0, max_value=8),
    base_score=st.integers(min_value=0, max_value=100),
)
def test_property5_relevance_score_capped_at_100(keywords, match_count, base_score):
    """Validates: Requirement 3.5"""
    scorer = ArticleScorer()
    actual = min(match_count, len(keywords))
    raw_content = " ".join(keywords[:actual])
    row = {"title": "", "raw_content": raw_content, "category": "", "source": ""}

    with patch.object(scorer, "_calculate_behavior_boost", return_value=float(base_score)):
        result = scorer.calculate_relevance_score(row, {}, keywords)

    assert 0 <= result <= 100, (
        f"relevance_score={result} out of [0,100] (base={base_score}, matches={actual})"
    )


# ---------------------------------------------------------------------------
# Property 6 — Keyword matching is case-insensitive substring
# ---------------------------------------------------------------------------

_ASCII_LOWER = "abcdefghijklmnopqrstuvwxyz"

@settings(max_examples=25)
@given(
    keyword=st.text(alphabet=_ASCII_LOWER, min_size=3, max_size=15),
    prefix=st.text(alphabet=_ASCII_LOWER, min_size=0, max_size=8),
    suffix=st.text(alphabet=_ASCII_LOWER, min_size=0, max_size=8),
)
def test_property6_case_insensitive_substring(keyword, prefix, suffix):
    """Validates: Requirement 3.7"""
    scorer = ArticleScorer()

    variants = [
        (prefix + keyword.lower() + suffix, [keyword.lower()]),
        (prefix + keyword.upper() + suffix, [keyword.lower()]),
        (prefix + keyword.lower() + suffix, [keyword.upper()]),
        (prefix + keyword.upper() + suffix, [keyword.upper()]),
        (prefix + keyword.swapcase() + suffix, [keyword.lower()]),
        (prefix + keyword.swapcase() + suffix, [keyword.upper()]),
    ]

    boosts = [scorer.calculate_keyword_boost("", text, kws) for text, kws in variants]

    for i, b in enumerate(boosts):
        assert b > 0, f"variant {i}: keyword={keyword!r} not detected — case-insensitive match failed"

    assert len(set(boosts)) == 1, (
        f"Inconsistent boost across casing variants for keyword={keyword!r}: {boosts}"
    )
