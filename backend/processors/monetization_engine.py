from __future__ import annotations

import re
from typing import List, Dict
from datetime import datetime, timezone

from backend.db.session import get_session
from ..models import AffiliateLink

class MonetizationEngine:
    """Handles automatic insertion of affiliate links into content."""

    def __init__(self):
        self._links: Dict[str, str] = {}
        self._load_links()

    def _load_links(self) -> None:
        """Load keyword -> url mappings from database."""
        with get_session() as session:
            links = session.query(AffiliateLink).all()
            for link in links:
                self._links[link.keyword.lower()] = link.url

    def refresh(self) -> None:
        """Refresh links from database."""
        self._links = {}
        self._load_links()

    def apply_monetization(self, content: str) -> str:
        """Replace keywords with affiliate links in content."""
        if not content:
            return content

        # Sort keywords by length descending to match longer phrases first
        sorted_keywords = sorted(self._links.keys(), key=len, reverse=True)
        
        for keyword in sorted_keywords:
            url = self._links[keyword]
            # Use regex to match whole words only, case-insensitive
            pattern = re.compile(rf'\b({re.escape(keyword)})\b', re.IGNORECASE)
            
            # Find and replace, but avoid nested markdown links
            # This is a simple implementation; advanced usage might need a proper parser
            content = pattern.sub(rf'[\1]({url})', content)
            
            # Track usage
            self._track_usage(keyword)

        return content

    def _track_usage(self, keyword: str) -> None:
        """Increment usage count for an affiliate link."""
        with get_session() as session:
            link = session.query(AffiliateLink).filter(
                AffiliateLink.keyword.ilike(keyword)
            ).first()
            if link:
                link.usage_count += 1
                link.last_used = datetime.now(timezone.utc)
                session.commit()

# Singleton instance
monetization_engine = MonetizationEngine()
